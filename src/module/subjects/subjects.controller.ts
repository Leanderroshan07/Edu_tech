import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../../auth/strategies/jwt.strategy';

@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  /** HOD/Admin creates a subject */
  @Post()
  @Roles(Role.ADMIN, Role.HOD)
  create(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(dto);
  }

  /** Anyone logged in can view subjects */
  @Get()
  @Roles(Role.ADMIN, Role.HOD, Role.TEACHER, Role.STUDENT)
  findAll(@Query('departmentId') departmentId?: string) {
    return this.subjectsService.findAll(departmentId);
  }

  /** Single subject with its teacher profiles */
  @Get(':id')
  @Roles(Role.ADMIN, Role.HOD, Role.TEACHER, Role.STUDENT)
  findOne(@Param('id') id: string) {
    return this.subjectsService.findOne(id);
  }

  /** HOD/Admin updates subject metadata */
  @Patch(':id')
  @Roles(Role.ADMIN, Role.HOD)
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectsService.update(id, dto);
  }

  /** HOD/Admin deletes a subject */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.HOD)
  remove(@Param('id') id: string) {
    return this.subjectsService.remove(id);
  }

  /** HOD assigns a teacher to a subject */
  @Post(':id/assign-teacher')
  @Roles(Role.ADMIN, Role.HOD)
  assignTeacher(
    @Param('id') subjectId: string,
    @Body('teacherUserId') teacherUserId: string,
    @Body('type') type: 'PRIMARY' | 'SECONDARY' = 'PRIMARY',
    @CurrentUser() currentUser: AccessTokenPayload,
  ) {
    return this.subjectsService.assignTeacher(subjectId, teacherUserId, type, currentUser);
  }

  /** HOD removes a teacher from a subject */
  @Delete(':id/teachers/:teacherUserId')
  @Roles(Role.ADMIN, Role.HOD)
  removeTeacher(
    @Param('id') subjectId: string,
    @Param('teacherUserId') teacherUserId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
  ) {
    return this.subjectsService.removeTeacher(subjectId, teacherUserId, currentUser);
  }
}
