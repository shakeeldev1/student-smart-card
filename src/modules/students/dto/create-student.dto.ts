import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { Gender } from '../enums/gender.enum';
import { GuardianRelationship } from '../enums/guardian-relationship.enum';
import { normalizeDigits } from '../../../common/transforms/normalize-digits.transform';

export class CreateStudentDto {
  @IsString()
  @MaxLength(150)
  fullName: string;

  @IsString()
  @MaxLength(150)
  fatherName: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  motherName?: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEnum(Gender)
  gender: Gender;

  @Transform(normalizeDigits)
  @Matches(/^\d{13}$/, { message: 'bFormNumber must be a 13-digit number' })
  bFormNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  className?: string;

  // When a school registers a student, they select one of their own
  // classes instead of typing a free-text class name.
  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  institutionName?: string;

  @IsString()
  @MaxLength(150)
  guardianName: string;

  @Transform(normalizeDigits)
  @Matches(/^\d{13}$/, { message: 'guardianCnic must be a 13-digit number' })
  guardianCnic: string;

  @IsDateString()
  guardianDateOfBirth: string;

  @IsEnum(GuardianRelationship)
  guardianRelationship: GuardianRelationship;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  guardianMobile?: string;

  @IsOptional()
  @IsEmail()
  guardianEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  guardianAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  guardianCity?: string;

  @IsOptional()
  @IsBoolean()
  consentEnrollment?: boolean;

  @IsOptional()
  @IsBoolean()
  consentIdentityVerification?: boolean;

  @IsOptional()
  @IsBoolean()
  consentTermsAccepted?: boolean;

  @IsOptional()
  @IsBoolean()
  consentDeclarationAccepted?: boolean;
}
