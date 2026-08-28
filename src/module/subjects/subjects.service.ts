import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { AccessTokenPayload } from '../../auth/strategies/jwt.strategy';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubjectDto) {
    const codeUpper = dto.code.trim().toUpperCase();

    const existing = await this.prisma.subject.findUnique({ where: { code: codeUpper } });
    if (existing) throw new ConflictException(`Subject code '${codeUpper}' is already in use`);

    const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
    if (!dept) throw new BadRequestException(`Department '${dto.departmentId}' not found`);

    return this.prisma.subject.create({
      data: {
        code: codeUpper,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        credits: dto.credits ?? 3,
        semester: dto.semester ?? 1,
        departmentId: dto.departmentId,
      },
      include: this.subjectInclude(),
    });
  }

  async findAll(departmentId?: string) {
    return this.prisma.subject.findMany({
      where: { isActive: true, ...(departmentId ? { departmentId } : {}) },
      include: this.subjectInclude(),
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: this.subjectInclude(),
    });
    if (!subject) throw new NotFoundException(`Subject '${id}' not found`);
    return subject;
  }

  async update(id: string, dto: UpdateSubjectDto) {
    await this.findOne(id);

    const data: Prisma.SubjectUpdateInput = {
      ...(dto.name && { name: dto.name.trim() }),
      ...(dto.description !== undefined && { description: dto.description?.trim() }),
      ...(dto.credits !== undefined && { credits: dto.credits }),
      ...(dto.semester !== undefined && { semester: dto.semester }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.code && { code: dto.code.trim().toUpperCase() }),
    };

    try {
      return await this.prisma.subject.update({
        where: { id },
        data,
        include: this.subjectInclude(),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Subject code already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.subject.delete({ where: { id } });
    return { message: `Subject '${id}' deleted` };
  }

  // ─── HOD/Admin directly assigns a teacher to a subject ────────────────────
  async assignTeacher(
    subjectId: string,
    teacherUserId: string,
    type: 'PRIMARY' | 'SECONDARY',
    currentUser: AccessTokenPayload,
  ) {
    const subject = await this.findOne(subjectId);

    if (currentUser.role !== Role.ADMIN) {
      if (currentUser.role !== Role.HOD) {
        throw new ForbiddenException('Only HOD or Admin can assign teachers to subjects');
      }
      const hodProfile = await this.prisma.hodProfile.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!hodProfile || hodProfile.departmentId !== subject.departmentId) {
        throw new ForbiddenException('You can only assign teachers to subjects in your department');
      }
    }

    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });
    if (!teacherProfile) throw new NotFoundException('Teacher profile not found');

    // Teacher must belong to this dept (primary or approved secondary)
    const inDept =
      teacherProfile.departmentId === subject.departmentId ||
      (await this.prisma.teacherDepartment.findFirst({
        where: {
          teacherProfileId: teacherProfile.id,
          departmentId: subject.departmentId,
        },
      })) !== null;

    if (!inDept) {
      throw new ForbiddenException(
        'Teacher must be a member of this department before being assigned a subject',
      );
    }

    await this.prisma.teacherSubject.upsert({
      where: {
        teacherProfileId_subjectId: {
          teacherProfileId: teacherProfile.id,
          subjectId,
        },
      },
      update: { type },
      create: {
        teacherProfileId: teacherProfile.id,
        subjectId,
        type,
      },
    });

    return this.findOne(subjectId);
  }

  // ─── HOD/Admin removes a teacher assignment ───────────────────────────────
  async removeTeacher(
    subjectId: string,
    teacherUserId: string,
    currentUser: AccessTokenPayload,
  ) {
    const subject = await this.findOne(subjectId);

    if (currentUser.role !== Role.ADMIN) {
      if (currentUser.role !== Role.HOD) {
        throw new ForbiddenException('Only HOD or Admin can remove teacher assignments');
      }
      const hodProfile = await this.prisma.hodProfile.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!hodProfile || hodProfile.departmentId !== subject.departmentId) {
        throw new ForbiddenException('You can only manage subjects in your department');
      }
    }

    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });
    if (!teacherProfile) throw new NotFoundException('Teacher profile not found');

    await this.prisma.teacherSubject.deleteMany({
      where: { teacherProfileId: teacherProfile.id, subjectId },
    });

    return this.findOne(subjectId);
  }

  private subjectInclude() {
    return {
      department: true,
      teacherSubjects: {
        include: {
          teacherProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  profileImageUrl: true,
                },
              },
              department: true,
            },
          },
        },
      },
    };
  }
}
