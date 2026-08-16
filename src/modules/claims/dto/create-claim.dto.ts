import { IsString, IsEnum, IsDateString, IsOptional } from 'class-validator';
import { ClaimType } from '../enums/claim-type.enum';

export class CreateClaimDto {
  @IsString()
  cardNumber: string;

  @IsEnum(ClaimType)
  claimType: ClaimType;

  @IsOptional()
  @IsDateString()
  dateOfDeath?: string;

  @IsOptional()
  @IsDateString()
  dateOfAccidentalDisability?: string;
}
