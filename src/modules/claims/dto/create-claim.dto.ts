import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ClaimType } from '../enums/claim-type.enum';
import { ClaimantRelationship } from '../enums/claimant-relationship.enum';

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

  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeOfIncident?: string;

  @IsString()
  @MaxLength(150)
  claimantName: string;

  @IsEnum(ClaimantRelationship)
  claimantRelationship: ClaimantRelationship;

  @Matches(/^\d{13}$/, { message: 'claimantCnic must be a 13-digit number' })
  claimantCnic: string;

  @IsString()
  @MaxLength(20)
  claimantContactNumber: string;

  @IsString()
  @MaxLength(150)
  claimantSignature: string;

  @IsOptional()
  @IsBoolean()
  documentDeathCertificate?: boolean;

  @IsOptional()
  @IsBoolean()
  documentMedicalDisability?: boolean;

  @IsOptional()
  @IsBoolean()
  documentStudentCnicOrBForm?: boolean;

  @IsOptional()
  @IsBoolean()
  documentClaimantCnic?: boolean;

  @IsOptional()
  @IsBoolean()
  documentStudentCard?: boolean;

  @IsOptional()
  @IsBoolean()
  documentPoliceReport?: boolean;
}
