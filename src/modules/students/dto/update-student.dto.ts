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

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  fatherName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  motherName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @Transform(normalizeDigits)
  @Matches(/^\d{13}$/, { message: 'bFormNumber must be a 13-digit number' })
  bFormNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  className?: string;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsUUID()
  sectionId?: string | null;

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
  @MaxLength(200)
  institutionName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  guardianName?: string;

  @IsOptional()
  @Transform(normalizeDigits)
  @Matches(/^\d{13}$/, { message: 'guardianCnic must be a 13-digit number' })
  guardianCnic?: string;

  @IsOptional()
  @IsDateString()
  guardianDateOfBirth?: string;

  @IsOptional()
  @IsEnum(GuardianRelationship)
  guardianRelationship?: GuardianRelationship;

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
