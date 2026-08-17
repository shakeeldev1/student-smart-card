import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ClaimStatus } from '../enums/claim-status.enum';

export class UpdateClaimStatusDto {
  @IsEnum(ClaimStatus)
  status: ClaimStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
