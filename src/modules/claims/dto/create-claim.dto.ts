import { Transform } from 'class-transformer';
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
import { normalizeDigits } from '../../../common/transforms/normalize-digits.transform';

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

  @Transform(normalizeDigits)
  @Matches(/^\d{13}$/, { message: 'claimantCnic must be a 13-digit number' })
  claimantCnic: string;

  @Transform(normalizeDigits)
  @Matches(/^(?:\+?92|0)?3\d{9}$/, {
    message: 'claimantContactNumber must be a valid Pakistan mobile number',
  })
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
