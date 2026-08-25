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
import { Role, UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateUserStatusDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../../auth/strategies/jwt.strategy';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.HOD, Role.TEACHER)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AccessTokenPayload) {
    return this.usersService.create(dto, user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.HOD, Role.TEACHER, Role.STUDENT)
  findAll(
    @CurrentUser() user: AccessTokenPayload,
    @Query('role') role?: Role,
    @Query('status') status?: UserStatus,
    @Query('departmentId') departmentId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAll(
      {
        role,
        status,
        departmentId,
        search,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
      user,
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.HOD, Role.TEACHER, Role.STUDENT)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  softDelete(@Param('id') id: string) {
    return this.usersService.softDelete(id);
  }
}

