import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSubjectDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  credits?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  semester?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
