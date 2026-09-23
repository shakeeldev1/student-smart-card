import { Transform } from 'class-transformer';
import {
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

  // Optional — only meaningful alongside classId when the selected class
  // has sections defined.
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  // School's own roll number; printed on the student's card.
  @IsOptional()
  @IsString()
  @MaxLength(50)
  rollNumber?: string;

  @IsOptional()
  @Transform(normalizeDigits)
  @Matches(/^(?:\+?92|0)?3\d{9}$/, {
    message: 'contactNumber must be a valid Pakistan mobile number',
  })
  contactNumber?: string;

  // Required: the account-setup link and card verification codes go here.
  @IsEmail()
  email: string;

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
  @Transform(normalizeDigits)
  @Matches(/^(?:\+?92|0)?3\d{9}$/, {
    message: 'guardianMobile must be a valid Pakistan mobile number',
  })
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
}
