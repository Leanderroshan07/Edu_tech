import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { Role, Gender } from '@prisma/client';

import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  // Profile fields
  @IsOptional()
  @IsString()
  departmentId?: string;

  // Student specific
  @IsOptional()
  @IsString()
  registerNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  admissionYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  academicYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  semester?: number;

  @IsOptional()
  @IsString()
  section?: string;

  // Teacher / HOD specific
  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  qualification?: string;
}
