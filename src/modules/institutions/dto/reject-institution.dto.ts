import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectInstitutionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
