import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum RequestType {
  STUDENT_APPROVAL = 'STUDENT_APPROVAL',
  TEACHER_DEPT_REQUEST = 'TEACHER_DEPT_REQUEST',
  TEACHER_SUBJECT_REQUEST = 'TEACHER_SUBJECT_REQUEST',
}

export class CreateRequestDto {
  @IsEnum(RequestType)
  type!: RequestType;

  @IsUUID()
  targetDeptId!: string;

  @IsUUID()
  @IsOptional()
  subjectId?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
