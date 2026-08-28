import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../../auth/strategies/jwt.strategy';

@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  /** Teacher creates a dept-join or subject request */
  @Post()
  @Roles(Role.TEACHER)
  create(@Body() dto: CreateRequestDto, @CurrentUser() user: AccessTokenPayload) {
    return this.requestsService.create(dto, user);
  }

  /** All requests visible to current user */
  @Get()
  @Roles(Role.ADMIN, Role.HOD, Role.TEACHER, Role.STUDENT)
  findAll(@CurrentUser() user: AccessTokenPayload) {
    return this.requestsService.findAll(user);
  }

  /** Pending requests that the current user can action */
  @Get('pending')
  @Roles(Role.ADMIN, Role.HOD, Role.TEACHER, Role.STUDENT)
  findPending(@CurrentUser() user: AccessTokenPayload) {
    return this.requestsService.findPending(user);
  }

  /** Approve a request */
  @Patch(':id/approve')
  @Roles(Role.ADMIN, Role.HOD, Role.TEACHER)
  approve(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.requestsService.approve(id, user);
  }

  /** Reject a request */
  @Patch(':id/reject')
  @Roles(Role.ADMIN, Role.HOD, Role.TEACHER)
  reject(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.requestsService.reject(id, user);
  }
}
