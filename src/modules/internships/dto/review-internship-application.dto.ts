import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectInternshipApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RequestChangesInternshipApplicationDto {
  @IsString()
  @MaxLength(500)
  reason: string;
}
