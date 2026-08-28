import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../../auth/strategies/jwt.strategy';
import { Role } from '@prisma/client';
import { MaterialsService } from './materials.service';
import { StorageService } from './storage.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { RecordVideoEventDto } from './dto/record-event.dto';

@Controller('materials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialsController {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly storageService: StorageService,
  ) {}

  @Post('upload-file')
  @Roles(Role.TEACHER, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new Error('No file provided');
    }
    return this.storageService.uploadFile(file.buffer, file.originalname, file.mimetype);
  }

  @Post()
  @Roles(Role.TEACHER, Role.ADMIN)
  async create(
    @Body() dto: CreateMaterialDto,
    @CurrentUser() currentUser: AccessTokenPayload,
  ) {
    return this.materialsService.create(dto, currentUser);
  }

  @Get()
  async findAll(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Query('subjectId') subjectId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.materialsService.findAll(currentUser, subjectId, departmentId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: AccessTokenPayload,
  ) {
    return this.materialsService.findOne(id, currentUser);
  }

  @Delete(':id')
  @Roles(Role.TEACHER, Role.HOD, Role.ADMIN)
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: AccessTokenPayload,
  ) {
    return this.materialsService.remove(id, currentUser);
  }

  @Post(':id/events')
  @Roles(Role.STUDENT)
  async recordVideoEvent(
    @Param('id') id: string,
    @Body() dto: RecordVideoEventDto,
    @CurrentUser() currentUser: AccessTokenPayload,
  ) {
    return this.materialsService.recordVideoEvent(id, dto, currentUser);
  }

  @Get(':id/progress')
  @Roles(Role.STUDENT)
  async getStudentProgress(
    @Param('id') id: string,
    @CurrentUser() currentUser: AccessTokenPayload,
  ) {
    return this.materialsService.getStudentProgress(id, currentUser);
  }

  @Get(':id/analytics')
  @Roles(Role.TEACHER, Role.HOD, Role.ADMIN)
  async getVideoAnalytics(
    @Param('id') id: string,
    @CurrentUser() currentUser: AccessTokenPayload,
  ) {
    return this.materialsService.getVideoAnalytics(id, currentUser);
  }

  @Get(':id/analytics/student/:studentProfileId')
  @Roles(Role.TEACHER, Role.HOD, Role.ADMIN)
  async getVideoStudentAnalytics(
    @Param('id') id: string,
    @Param('studentProfileId') studentProfileId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
  ) {
    return this.materialsService.getVideoStudentAnalytics(id, studentProfileId, currentUser);
  }
}
