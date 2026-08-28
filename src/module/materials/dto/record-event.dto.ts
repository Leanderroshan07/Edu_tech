import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { VideoEventType } from '@prisma/client';

export class RecordVideoEventDto {
  @IsEnum(VideoEventType)
  @IsNotEmpty()
  eventType!: VideoEventType;

  @IsNumber()
  @IsNotEmpty()
  positionSeconds!: number;

  @IsString()
  @IsOptional()
  clientTs?: string;

  @IsOptional()
  metadata?: any;
}
