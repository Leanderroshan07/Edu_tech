import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcrypt';
import { Role, UserStatus, User } from '@prisma/client';
import { PrismaService } from '../lib/database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../module/users/users.service';
import { CreateUserDto } from '../module/users/dto/create-user.dto';
import { UpdateProfileDto } from '../module/users/dto/update-user.dto';

const refreshCookieName = 'refresh_token';
const refreshTokenDays = 7;

@Injectable()
export class AuthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly jwtService: JwtService,
		private readonly usersService: UsersService,
	) { }

	async register(dto: CreateUserDto, response: Response) {
		const createdUser = await this.usersService.create(dto);

		const accessToken = await this.createAccessToken(createdUser.id, createdUser.email, createdUser.role);
		await this.issueRefreshToken(createdUser.id, response);

		return { accessToken, user: createdUser };
	}

	async updateProfile(userId: string, dto: UpdateProfileDto) {
		return this.usersService.updateProfile(userId, dto);
	}

	async addTeachingDepartment(userId: string, departmentId: string) {
		return this.usersService.addTeachingDepartment(userId, departmentId);
	}

	async removeTeachingDepartment(userId: string, departmentId: string) {
		return this.usersService.removeTeachingDepartment(userId, departmentId);
	}

	async login(loginDto: LoginDto, response: Response) {
		const user = await this.prisma.user.findUnique({ where: { email: loginDto.email.toLowerCase() } });
		if (!user || user.deletedAt || !(await bcrypt.compare(loginDto.password, user.passwordHash))) {
			throw new UnauthorizedException('Invalid email or password');
		}

		if (user.status === UserStatus.PENDING) {
			throw new UnauthorizedException('Account is pending approval from your department teacher or HOD');
		}

		if (user.status !== UserStatus.ACTIVE) {
			throw new UnauthorizedException('Account is inactive or suspended');
		}

		// Update last login timestamp
		await this.prisma.user.update({
			where: { id: user.id },
			data: { lastLoginAt: new Date() },
		});

		const accessToken = await this.createAccessToken(user.id, user.email, user.role);
		await this.issueRefreshToken(user.id, response);

		const fullUser = await this.getUser(user.id);
		return { accessToken, user: fullUser };
	}

	async refresh(rawToken: string | undefined, response: Response) {
		if (!rawToken) throw new UnauthorizedException('Refresh token is required');

		const tokenHash = this.hashToken(rawToken);
		const storedToken = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
		if (!storedToken) throw new UnauthorizedException('Invalid refresh token');

		if (storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
			if (storedToken.replacedByTokenHash) {
				await this.prisma.refreshToken.updateMany({
					where: { userId: storedToken.userId, revokedAt: null },
					data: { revokedAt: new Date() },
				});
			}
			throw new UnauthorizedException('Refresh token is no longer valid');
		}

		const user = await this.prisma.user.findUnique({ where: { id: storedToken.userId } });
		if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
			throw new UnauthorizedException('User is no longer active');
		}

		const replacementRawToken = this.generateRefreshToken();
		const replacementHash = this.hashToken(replacementRawToken);
		const expiresAt = this.refreshExpiry();

		await this.prisma.$transaction([
			this.prisma.refreshToken.update({
				where: { id: storedToken.id },
				data: { revokedAt: new Date(), replacedByTokenHash: replacementHash },
			}),
			this.prisma.refreshToken.create({
				data: { tokenHash: replacementHash, userId: user.id, expiresAt },
			}),
		]);

		this.setRefreshCookie(response, replacementRawToken, expiresAt);
		const fullUser = await this.getUser(user.id);
		return { accessToken: await this.createAccessToken(user.id, user.email, user.role), user: fullUser };
	}

	async logout(rawToken: string | undefined, response: Response): Promise<void> {
		if (rawToken) {
			await this.prisma.refreshToken.updateMany({
				where: { tokenHash: this.hashToken(rawToken), revokedAt: null },
				data: { revokedAt: new Date() },
			});
		}
		response.clearCookie(refreshCookieName, this.cookieOptions());
	}

	async getUser(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			include: {
				studentProfile: { include: { department: true } },
				teacherProfile: { include: { department: true } },
				hodProfile: { include: { department: true } },
			},
		});
		if (!user || user.deletedAt) throw new ConflictException('User no longer exists');
		return this.publicUser(user);
	}

	private async createAccessToken(userId: string, email: string, role: Role): Promise<string> {
		return this.jwtService.signAsync({ sub: userId, email, role });
	}

	private async issueRefreshToken(userId: string, response: Response): Promise<void> {
		const rawToken = this.generateRefreshToken();
		const expiresAt = this.refreshExpiry();
		await this.prisma.refreshToken.create({
			data: { tokenHash: this.hashToken(rawToken), userId, expiresAt },
		});
		this.setRefreshCookie(response, rawToken, expiresAt);
	}

	private generateRefreshToken(): string {
		return randomBytes(48).toString('base64url');
	}

	private hashToken(token: string): string {
		return createHash('sha256').update(token).digest('hex');
	}

	private refreshExpiry(): Date {
		return new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);
	}

	private setRefreshCookie(response: Response, token: string, expiresAt: Date): void {
		response.cookie(refreshCookieName, token, { ...this.cookieOptions(), expires: expiresAt });
	}

	private cookieOptions() {
		return {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax' as const,
			path: '/auth',
		};
	}

	private publicUser(user: any) {
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
			createdAt: user.createdAt,
			profile: profile,
		};
	}
}
