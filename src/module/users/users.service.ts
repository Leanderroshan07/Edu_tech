import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateUserStatusDto, UpdateProfileDto } from './dto/update-user.dto';
import { AccessTokenPayload } from '../../auth/strategies/jwt.strategy';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, currentUser?: AccessTokenPayload) {
    const emailLower = dto.email.toLowerCase();

    if (dto.role === Role.ADMIN) {
      throw new BadRequestException('Cannot create ADMIN role through standard registration');
    }

    // Role creation permission rules:
    // HOD can create TEACHER or STUDENT in their department
    // TEACHER can create STUDENT in their department
    // ADMIN can create any role
    if (currentUser && currentUser.role !== Role.ADMIN) {
      if (currentUser.role === Role.HOD && dto.role !== Role.TEACHER && dto.role !== Role.STUDENT) {
        throw new ForbiddenException('HOD can only create Teachers and Students for their department');
      }
      if (currentUser.role === Role.TEACHER && dto.role !== Role.STUDENT) {
        throw new ForbiddenException('Teachers can only create Student accounts');
      }

      // Enforce department match for HOD / Teacher
      const creatorDeptIds = await this.getUserDepartmentIds(currentUser.sub, currentUser.role);
      if (dto.departmentId && !creatorDeptIds.includes(dto.departmentId)) {
        throw new ForbiddenException('You can only add users to your assigned department');
      }
      if (!dto.departmentId && creatorDeptIds.length > 0) {
        dto.departmentId = creatorDeptIds[0];
      }
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: emailLower },
    });
    if (existingUser) {
      throw new ConflictException('Email address is already in use');
    }

    if (!dto.departmentId) {
      throw new BadRequestException('Department ID is required for user profile');
    }

    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department || !department.isActive) {
      throw new BadRequestException('Department does not exist or is inactive');
    }

    if (dto.role === Role.STUDENT) {
      if (!dto.registerNumber || !dto.admissionYear || !dto.academicYear || !dto.semester) {
        throw new BadRequestException(
          'Student requires registerNumber, admissionYear, academicYear, and semester',
        );
      }
    } else if (dto.role === Role.TEACHER || dto.role === Role.HOD) {
      if (!dto.employeeNumber) {
        throw new BadRequestException('Teacher and HOD require employeeNumber');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const createdUserId = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: emailLower,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: dto.role,
            // Students start as PENDING until teacher/HOD approves
            status: dto.role === Role.STUDENT ? UserStatus.PENDING : UserStatus.ACTIVE,
            phone: dto.phone,
            gender: dto.gender,
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          },
        });

        if (dto.role === Role.STUDENT) {
          await tx.studentProfile.create({
            data: {
              userId: user.id,
              departmentId: dto.departmentId!,
              registerNumber: dto.registerNumber!,
              admissionYear: dto.admissionYear!,
              academicYear: dto.academicYear!,
              semester: dto.semester!,
              section: dto.section,
            },
          });
          // Auto-create approval request so teacher/HOD can approve
          await tx.approvalRequest.create({
            data: {
              type: 'STUDENT_APPROVAL',
              requesterId: user.id,
              targetDeptId: dto.departmentId!,
            },
          });
        } else if (dto.role === Role.TEACHER) {
          await tx.teacherProfile.create({
            data: {
              userId: user.id,
              departmentId: dto.departmentId!,
              employeeNumber: dto.employeeNumber!,
              designation: dto.designation,
              qualification: dto.qualification,
            },
          });
        } else if (dto.role === Role.HOD) {
          await tx.hodProfile.create({
            data: {
              userId: user.id,
              departmentId: dto.departmentId!,
              employeeNumber: dto.employeeNumber!,
            },
          });
        }

        return user.id;
      });

      return this.findOne(createdUserId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];
        if (target.includes('registerNumber')) {
          throw new ConflictException('Register number already exists');
        }
        if (target.includes('employeeNumber')) {
          throw new ConflictException('Employee number already exists');
        }
        throw new ConflictException('A unique constraint violation occurred');
      }
      throw error;
    }
  }

  private async getUserDepartmentIds(userId: string, role: Role): Promise<string[]> {
    if (role === Role.HOD) {
      const p = await this.prisma.hodProfile.findUnique({ where: { userId } });
      return p?.departmentId ? [p.departmentId] : [];
    }
    if (role === Role.TEACHER) {
      const p = await this.prisma.teacherProfile.findUnique({
        where: { userId },
        include: { teachingDepartments: true },
      });
      if (!p) return [];
      const depts = [p.departmentId];
      p.teachingDepartments.forEach((td) => {
        if (!depts.includes(td.departmentId)) {
          depts.push(td.departmentId);
        }
      });
      return depts;
    }
    if (role === Role.STUDENT) {
      const p = await this.prisma.studentProfile.findUnique({ where: { userId } });
      return p?.departmentId ? [p.departmentId] : [];
    }
    return [];
  }

  async findAll(
    params: {
      role?: Role;
      status?: UserStatus;
      departmentId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    currentUser?: AccessTokenPayload,
  ) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 50;
    const skip = (page - 1) * limit;

    const andConditions: Prisma.UserWhereInput[] = [{ deletedAt: null }];

    if (params.role) andConditions.push({ role: params.role });
    if (params.status) andConditions.push({ status: params.status });

    if (params.search) {
      andConditions.push({
        OR: [
          { firstName: { contains: params.search, mode: 'insensitive' } },
          { lastName: { contains: params.search, mode: 'insensitive' } },
          { email: { contains: params.search, mode: 'insensitive' } },
          { studentProfile: { registerNumber: { contains: params.search, mode: 'insensitive' } } },
          { teacherProfile: { employeeNumber: { contains: params.search, mode: 'insensitive' } } },
          { hodProfile: { employeeNumber: { contains: params.search, mode: 'insensitive' } } },
        ],
      });
    }

    if (currentUser && currentUser.role !== Role.ADMIN) {
      const allowedDeptIds = await this.getUserDepartmentIds(currentUser.sub, currentUser.role);
      if (allowedDeptIds.length > 0) {
        andConditions.push({
          OR: [
            { studentProfile: { departmentId: { in: allowedDeptIds } } },
            { teacherProfile: { departmentId: { in: allowedDeptIds } } },
            { hodProfile: { departmentId: { in: allowedDeptIds } } },
          ],
        });
      } else {
        andConditions.push({ id: 'none' });
      }
    } else if (params.departmentId) {
      andConditions.push({
        OR: [
          { studentProfile: { departmentId: params.departmentId } },
          { teacherProfile: { departmentId: params.departmentId } },
          { hodProfile: { departmentId: params.departmentId } },
        ],
      });
    }

    const where: Prisma.UserWhereInput = { AND: andConditions };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          profileImageUrl: true,
          dateOfBirth: true,
          gender: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          studentProfile: { include: { department: true } },
          teacherProfile: {
            include: {
              department: true,
              teachingDepartments: { include: { department: true } },
              teacherSubjects: { include: { subject: true } },
            },
          },
          hodProfile: { include: { department: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => this.formatUserResponse(user)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        profileImageUrl: true,
        dateOfBirth: true,
        gender: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        studentProfile: { include: { department: true } },
        teacherProfile: {
          include: {
            department: true,
            teachingDepartments: { include: { department: true } },
            teacherSubjects: { include: { subject: true } },
          },
        },
        hodProfile: { include: { department: true } },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.formatUserResponse(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const data: Prisma.UserUpdateInput = {
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(dto.lastName && { lastName: dto.lastName }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.gender && { gender: dto.gender }),
      ...(dto.profileImageUrl !== undefined && { profileImageUrl: dto.profileImageUrl }),
      ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
    };

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.findOne(id);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.findOne(userId);

    const userData: Prisma.UserUpdateInput = {
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(dto.lastName && { lastName: dto.lastName }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.gender && { gender: dto.gender }),
      ...(dto.profileImageUrl !== undefined && { profileImageUrl: dto.profileImageUrl }),
      ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
    };

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userData,
        });
      }

      if (user.role === Role.STUDENT && dto.section !== undefined) {
        await tx.studentProfile.update({
          where: { userId },
          data: { section: dto.section },
        });
      } else if (
        user.role === Role.TEACHER &&
        (dto.designation !== undefined || dto.qualification !== undefined)
      ) {
        await tx.teacherProfile.update({
          where: { userId },
          data: {
            ...(dto.designation !== undefined && { designation: dto.designation }),
            ...(dto.qualification !== undefined && { qualification: dto.qualification }),
          },
        });
      }
    });

    return this.findOne(userId);
  }

  async addTeachingDepartment(teacherUserId: string, departmentId: string) {
    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });
    if (!teacherProfile) {
      throw new NotFoundException('Teacher profile not found for this user');
    }

    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });
    if (!department || !department.isActive) {
      throw new BadRequestException('Department does not exist or is inactive');
    }

    if (teacherProfile.departmentId === departmentId) {
      throw new BadRequestException('Cannot add primary department as secondary teaching department');
    }

    try {
      await this.prisma.teacherDepartment.create({
        data: {
          teacherProfileId: teacherProfile.id,
          departmentId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Teaching department already added');
      }
      throw error;
    }

    return this.findOne(teacherUserId);
  }

  async removeTeachingDepartment(teacherUserId: string, departmentId: string) {
    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });
    if (!teacherProfile) {
      throw new NotFoundException('Teacher profile not found for this user');
    }

    await this.prisma.teacherDepartment.deleteMany({
      where: {
        teacherProfileId: teacherProfile.id,
        departmentId,
      },
    });

    return this.findOne(teacherUserId);
  }

  async addTeacherSubject(
    teacherUserId: string,
    dto: { subjectId: string; type?: 'PRIMARY' | 'SECONDARY' },
  ) {
    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });
    if (!teacherProfile) {
      throw new NotFoundException('Teacher profile not found for this user');
    }

    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    try {
      await this.prisma.teacherSubject.create({
        data: {
          teacherProfileId: teacherProfile.id,
          subjectId: dto.subjectId,
          type: dto.type ?? 'SECONDARY',
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Teacher subject assignment already exists');
      }
      throw error;
    }

    return this.findOne(teacherUserId);
  }

  async removeTeacherSubject(teacherUserId: string, subjectId: string) {
    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });
    if (!teacherProfile) {
      throw new NotFoundException('Teacher profile not found for this user');
    }

    await this.prisma.teacherSubject.deleteMany({
      where: {
        teacherProfileId: teacherProfile.id,
        subjectId,
      },
    });

    return this.findOne(teacherUserId);
  }


  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
    });
    return this.findOne(id);
  }

  async softDelete(id: string) {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: UserStatus.INACTIVE },
    });
    return { message: `User with ID ${id} deleted successfully` };
  }

  private formatUserResponse(user: any) {
    const profile = user.studentProfile || user.teacherProfile || user.hodProfile || null;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      profileImageUrl: user.profileImageUrl,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile,
    };
  }
}
