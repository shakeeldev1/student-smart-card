import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectStudentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RequestChangesStudentDto {
  @IsString()
  @MaxLength(500)
  reason: string;
}
