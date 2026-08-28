import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { MaterialType } from '@prisma/client';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(MaterialType)
  type!: MaterialType;

  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @IsNumber()
  @IsOptional()
  durationSeconds?: number;

  @IsString()
  @IsOptional()
  subjectId?: string;

  @IsString()
  @IsNotEmpty()
  departmentId!: string;
}
