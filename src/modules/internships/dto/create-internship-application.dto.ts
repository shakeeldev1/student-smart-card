import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { InternshipArea } from '../enums/internship-area.enum';
import { InternshipDuration } from '../enums/internship-duration.enum';
import { InternshipGender } from '../enums/internship-gender.enum';
import { InternshipMode } from '../enums/internship-mode.enum';
import { InternshipType } from '../enums/internship-type.enum';

const transformBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true';

export class CreateInternshipApplicationDto {
  @IsString()
  @MaxLength(150)
  fullName: string;

  @IsString()
  @MaxLength(150)
  fatherGuardianName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEnum(InternshipGender)
  gender: InternshipGender;

  @Matches(/^\d{13}$/, { message: 'bFormOrCnicNo must be a 13-digit number' })
  bFormOrCnicNo: string;

  @Matches(/^(?:\+?92|0)?3\d{9}$/, {
    message: 'mobileNumber must be a valid Pakistan mobile number',
  })
  mobileNumber: string;

  @IsEmail()
  emailAddress: string;

  @IsString()
  @MaxLength(300)
  currentAddress: string;

  @IsString()
  @MaxLength(120)
  cityDistrict: string;

  @IsString()
  @MaxLength(200)
  institutionName: string;

  @IsString()
  @MaxLength(80)
  studentRegistrationNo: string;

  @IsString()
  @MaxLength(120)
  currentClassDegree: string;

  @IsString()
  @MaxLength(120)
  programMajorSubject: string;

  @IsString()
  @MaxLength(80)
  currentSemesterYear: string;

  @Matches(/^\d{4}$/, {
    message: 'expectedGraduationYear must be a 4-digit year',
  })
  expectedGraduationYear: string;

  @IsString()
  @MaxLength(30)
  marksCgpa: string;

  @IsEnum(InternshipArea)
  internshipAreaField: InternshipArea;

  @IsString()
  @MaxLength(120)
  preferredInternshipLocation: string;

  @IsEnum(InternshipDuration)
  preferredDuration: InternshipDuration;

  @IsDateString()
  preferredStartDate: string;

  @IsEnum(InternshipType)
  internshipType: InternshipType;

  @IsEnum(InternshipMode)
  modeOfInternship: InternshipMode;

  @IsString()
  technicalSkills: string;

  @IsString()
  softSkills: string;

  @IsString()
  previousInternshipExperience: string;

  @IsString()
  projectsAchievements: string;

  @IsString()
  certifications: string;

  @IsString()
  @MaxLength(150)
  emergencyContactName: string;

  @IsString()
  @MaxLength(80)
  emergencyContactRelationship: string;

  @Matches(/^(?:\+?92|0)?3\d{9}$/, {
    message:
      'emergencyContactMobileNumber must be a valid Pakistan mobile number',
  })
  emergencyContactMobileNumber: string;

  @Transform(transformBoolean)
  @IsBoolean()
  @Equals(true, {
    message: 'Declaration consent must be accepted',
  })
  declarationAccepted: boolean;

  @Transform(transformBoolean)
  @IsBoolean()
  @Equals(true, {
    message: 'Terms and conditions must be accepted',
  })
  termsAccepted: boolean;
}
