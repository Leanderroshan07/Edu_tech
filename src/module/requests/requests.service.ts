import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RequestStatus, RequestType, Role } from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { AccessTokenPayload } from '../../auth/strategies/jwt.strategy';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Teacher sends a dept-join or subject request ─────────────────────────
  async create(dto: CreateRequestDto, currentUser: AccessTokenPayload) {
    if (currentUser.role !== Role.TEACHER) {
      throw new ForbiddenException('Only teachers can send requests');
    }

    // Validate target department
    const dept = await this.prisma.department.findUnique({
      where: { id: dto.targetDeptId },
    });
    if (!dept || !dept.isActive) {
      throw new NotFoundException('Target department not found or inactive');
    }

    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId: currentUser.sub },
    });
    if (!teacherProfile) {
      throw new NotFoundException('Teacher profile not found');
    }

    if (dto.type === RequestType.TEACHER_DEPT_REQUEST) {
      // Can't request primary dept
      if (teacherProfile.departmentId === dto.targetDeptId) {
        throw new BadRequestException('Cannot send a request for your own primary department');
      }
      // Can't request if already a member
      const existing = await this.prisma.teacherDepartment.findUnique({
        where: {
          teacherProfileId_departmentId: {
            teacherProfileId: teacherProfile.id,
            departmentId: dto.targetDeptId,
          },
        },
      });
      if (existing) {
        throw new ConflictException('You are already a member of this department');
      }
    }

    if (dto.type === RequestType.TEACHER_SUBJECT_REQUEST) {
      if (!dto.subjectId) {
        throw new BadRequestException('subjectId is required for subject requests');
      }
      const subject = await this.prisma.subject.findUnique({
        where: { id: dto.subjectId },
      });
      if (!subject) throw new NotFoundException('Subject not found');
    }

    // Guard: only one PENDING request per (requester, dept, type) allowed at a time
    const existingPending = await this.prisma.approvalRequest.findFirst({
      where: {
        requesterId: currentUser.sub,
        targetDeptId: dto.targetDeptId,
        type: dto.type as RequestType,
        status: RequestStatus.PENDING,
      },
    });
    if (existingPending) {
      throw new ConflictException('A pending request of this type already exists');
    }

    return this.prisma.approvalRequest.create({
      data: {
        type: dto.type as RequestType,
        requesterId: currentUser.sub,
        targetDeptId: dto.targetDeptId,
        subjectId: dto.subjectId ?? null,
        note: dto.note ?? null,
      },
      include: this.fullInclude(),
    });
  }

  // ─── List requests visible to current user ────────────────────────────────
  async findAll(currentUser: AccessTokenPayload) {
    if (currentUser.role === Role.ADMIN) {
      return this.prisma.approvalRequest.findMany({
        orderBy: { createdAt: 'desc' },
        include: this.fullInclude(),
      });
    }

    if (currentUser.role === Role.HOD) {
      const hodProfile = await this.prisma.hodProfile.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!hodProfile) return [];
      // HOD sees all requests targeting their department
      return this.prisma.approvalRequest.findMany({
        where: { targetDeptId: hodProfile.departmentId },
        orderBy: { createdAt: 'desc' },
        include: this.fullInclude(),
      });
    }

    if (currentUser.role === Role.TEACHER) {
      return this.prisma.approvalRequest.findMany({
        where: { requesterId: currentUser.sub },
        orderBy: { createdAt: 'desc' },
        include: this.fullInclude(),
      });
    }

    // Student — see their own approval request
    if (currentUser.role === Role.STUDENT) {
      return this.prisma.approvalRequest.findMany({
        where: {
          requesterId: currentUser.sub,
          type: RequestType.STUDENT_APPROVAL,
        },
        orderBy: { createdAt: 'desc' },
        include: this.fullInclude(),
      });
    }

    return [];
  }

  // HOD sees only PENDING requests for their department (for the approval badge)
  async findPending(currentUser: AccessTokenPayload) {
    if (currentUser.role === Role.HOD) {
      const hodProfile = await this.prisma.hodProfile.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!hodProfile) return [];
      return this.prisma.approvalRequest.findMany({
        where: { targetDeptId: hodProfile.departmentId, status: RequestStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        include: this.fullInclude(),
      });
    }

    if (currentUser.role === Role.TEACHER) {
      // Teacher sees pending student-approval requests for students in their dept
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!teacherProfile) return [];
      return this.prisma.approvalRequest.findMany({
        where: {
          targetDeptId: teacherProfile.departmentId,
          type: RequestType.STUDENT_APPROVAL,
          status: RequestStatus.PENDING,
        },
        orderBy: { createdAt: 'desc' },
        include: this.fullInclude(),
      });
    }

    return [];
  }

  // ─── Approve a request ────────────────────────────────────────────────────
  async approve(requestId: string, currentUser: AccessTokenPayload) {
    const req = await this.getAndAuthorize(requestId, currentUser);

    if (req.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Request is no longer pending');
    }

    // Perform the side-effect depending on request type
    if (req.type === RequestType.STUDENT_APPROVAL) {
      await this.prisma.user.update({
        where: { id: req.requesterId },
        data: { status: 'ACTIVE' },
      });
    }

    if (req.type === RequestType.TEACHER_DEPT_REQUEST) {
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: req.requesterId },
      });
      if (!teacherProfile) throw new NotFoundException('Teacher profile not found');

      // Guard against duplicate dept membership
      await this.prisma.teacherDepartment.upsert({
        where: {
          teacherProfileId_departmentId: {
            teacherProfileId: teacherProfile.id,
            departmentId: req.targetDeptId,
          },
        },
        update: {},
        create: {
          teacherProfileId: teacherProfile.id,
          departmentId: req.targetDeptId,
        },
      });
    }

    if (req.type === RequestType.TEACHER_SUBJECT_REQUEST) {
      if (!req.subjectId) throw new BadRequestException('Subject ID missing on request');
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: req.requesterId },
      });
      if (!teacherProfile) throw new NotFoundException('Teacher profile not found');

      await this.prisma.teacherSubject.upsert({
        where: {
          teacherProfileId_subjectId: {
            teacherProfileId: teacherProfile.id,
            subjectId: req.subjectId,
          },
        },
        update: {},
        create: {
          teacherProfileId: teacherProfile.id,
          subjectId: req.subjectId,
          type: 'SECONDARY',
        },
      });
    }

    return this.prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedByUserId: currentUser.sub,
      },
      include: this.fullInclude(),
    });
  }

  // ─── Reject a request ─────────────────────────────────────────────────────
  async reject(requestId: string, currentUser: AccessTokenPayload) {
    const req = await this.getAndAuthorize(requestId, currentUser);

    if (req.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Request is no longer pending');
    }

    return this.prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedByUserId: currentUser.sub,
      },
      include: this.fullInclude(),
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private async getAndAuthorize(requestId: string, currentUser: AccessTokenPayload) {
    const req = await this.prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: this.fullInclude(),
    });
    if (!req) throw new NotFoundException('Request not found');

    if (currentUser.role === Role.ADMIN) return req;

    if (currentUser.role === Role.HOD) {
      const hodProfile = await this.prisma.hodProfile.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!hodProfile || hodProfile.departmentId !== req.targetDeptId) {
        throw new ForbiddenException('You can only review requests for your department');
      }
      return req;
    }

    if (currentUser.role === Role.TEACHER) {
      // Teacher can only approve STUDENT_APPROVAL requests for their dept
      if (req.type !== RequestType.STUDENT_APPROVAL) {
        throw new ForbiddenException('Teachers can only approve student requests');
      }
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!teacherProfile || teacherProfile.departmentId !== req.targetDeptId) {
        throw new ForbiddenException('You can only review requests for your department');
      }
      return req;
    }

    throw new ForbiddenException('You are not authorized to review requests');
  }

  private fullInclude() {
    return {
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          studentProfile: { include: { department: true } },
          teacherProfile: { include: { department: true } },
        },
      },
      targetDept: true,
      subject: true,
      reviewer: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    };
  }
}
