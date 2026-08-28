import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

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

  @IsString()
  @IsNotEmpty()
  departmentId!: string;
}
