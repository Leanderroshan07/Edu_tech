import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccessTokenPayload } from './strategies/jwt.strategy';
import { CreateUserDto } from '../module/users/dto/create-user.dto';
import { UpdateProfileDto } from '../module/users/dto/update-user.dto';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) { }

	@Post('register')
	register(@Body() dto: CreateUserDto, @Res({ passthrough: true }) response: Response) {
		return this.authService.register(dto, response);
	}

	@Post('login')
	login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
		return this.authService.login(loginDto, response);
	}

	@Post('refresh')
	refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
		return this.authService.refresh(request.cookies?.refresh_token, response);
	}

	@Post('logout')
	async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
		await this.authService.logout(request.cookies?.refresh_token, response);
		return { message: 'Logged out' };
	}

	@UseGuards(JwtAuthGuard)
	@Get('me')
	me(@Req() request: Request & { user: AccessTokenPayload }) {
		return this.authService.getUser(request.user.sub);
	}

	@UseGuards(JwtAuthGuard)
	@Patch('profile')
	updateProfile(
		@Req() request: Request & { user: AccessTokenPayload },
		@Body() dto: UpdateProfileDto,
	) {
		return this.authService.updateProfile(request.user.sub, dto);
	}

	@UseGuards(JwtAuthGuard)
	@Post('teaching-departments')
	addTeachingDepartment(
		@Req() request: Request & { user: AccessTokenPayload },
		@Body('departmentId') departmentId: string,
	) {
		return this.authService.addTeachingDepartment(request.user.sub, departmentId);
	}

	@UseGuards(JwtAuthGuard)
	@Delete('teaching-departments/:departmentId')
	removeTeachingDepartment(
		@Req() request: Request & { user: AccessTokenPayload },
		@Param('departmentId') departmentId: string,
	) {
		return this.authService.removeTeachingDepartment(request.user.sub, departmentId);
	}
}
