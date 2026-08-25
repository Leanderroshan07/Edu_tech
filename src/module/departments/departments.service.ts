import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/create-department.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto) {
    const codeUpper = dto.code.toUpperCase();
    const existing = await this.prisma.department.findFirst({
      where: {
        OR: [{ code: codeUpper }, { name: dto.name }],
      },
    });

    if (existing) {
      throw new ConflictException('Department code or name already exists');
    }

    try {
      return await this.prisma.department.create({
        data: {
          code: codeUpper,
          name: dto.name,
          description: dto.description,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Department code or name already exists');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.department.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            studentProfiles: true,
            teacherProfiles: true,
            hodProfiles: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findOne(id);

    try {
      return await this.prisma.department.update({
        where: { id },
        data: {
          ...(dto.code && { code: dto.code.toUpperCase() }),
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Department code or name already exists');
      }
      throw error;
    }
  }

  async setStatus(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.department.update({
      where: { id },
      data: { isActive },
    });
  }
}
