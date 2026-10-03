import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Gender } from '../../students/enums/gender.enum';
import { NomineeRelationship } from '../enums/nominee-relationship.enum';
import { normalizeDigits } from '../../../common/transforms/normalize-digits.transform';
import {
  MAX_PRODUCT_VARIANT,
  MIN_PRODUCT_VARIANT,
} from '../../../common/insurance/coverage.util';

export class CreateIndividualApplicationDto {
  @IsString()
  @MaxLength(150)
  fullName: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  fatherName?: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEnum(Gender)
  gender: Gender;

  @Transform(normalizeDigits)
  @Matches(/^\d{13}$/, { message: 'cnicNumber must be a 13-digit number' })
  cnicNumber: string;

  @IsOptional()
  @Transform(normalizeDigits)
  @Matches(/^(?:\+?92|0)?3\d{9}$/, {
    message: 'contactNumber must be a valid Pakistan mobile number',
  })
  contactNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tehsil?: string;

  // EFU takaful product variant (1–10). Required: it sets both the coverage
  // (variant × 100,000) and the registration fee (variant × 1,000).
  @Type(() => Number)
  @IsInt()
  @Min(MIN_PRODUCT_VARIANT)
  @Max(MAX_PRODUCT_VARIANT)
  productVariant: number;

  @IsString()
  @MaxLength(150)
  nomineeName: string;

  @IsEnum(NomineeRelationship)
  nomineeRelationship: NomineeRelationship;

  @Transform(normalizeDigits)
  @Matches(/^\d{13}$/, { message: 'nomineeCnic must be a 13-digit number' })
  nomineeCnic: string;

  @Transform(normalizeDigits)
  @Matches(/^(?:\+?92|0)?3\d{9}$/, {
    message: 'nomineeMobile must be a valid Pakistan mobile number',
  })
  nomineeMobile: string;

  @IsOptional()
  @IsEmail()
  nomineeEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  nomineeAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nomineeCity?: string;

  @IsBoolean()
  consentEnrollment: boolean;

  @IsBoolean()
  consentIdentityVerification: boolean;

  @IsBoolean()
  consentTermsAccepted: boolean;

  @IsBoolean()
  consentDeclarationAccepted: boolean;
}
