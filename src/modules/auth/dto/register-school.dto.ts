import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { InstitutionType } from '../../institutions/enums/institution-type.enum';
import { normalizeDigits } from '../../../common/transforms/normalize-digits.transform';

export class InstitutionRegistrationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  registrationNumber: string;

  @IsEnum(InstitutionType)
  type: InstitutionType;

  @IsString()
  @MaxLength(300)
  address: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @Transform(normalizeDigits)
  @Matches(/^(?:\+?92|0)\d{9,10}$/, {
    message: 'contactNumber must be a valid Pakistan phone number',
  })
  contactNumber: string;

  @IsEmail()
  officialEmail: string;

  @IsString()
  @MaxLength(120)
  principalName: string;

  @IsString()
  @MaxLength(120)
  authorizedPersonName: string;

  @IsString()
  @MaxLength(120)
  authorizedPersonDesignation: string;

  @Transform(normalizeDigits)
  @Matches(/^\d{13}$/, {
    message: 'authorizedPersonCnic must be a 13-digit number',
  })
  authorizedPersonCnic: string;

  @Transform(normalizeDigits)
  @Matches(/^(?:\+?92|0)?3\d{9}$/, {
    message: 'authorizedPersonMobile must be a valid Pakistan mobile number',
  })
  authorizedPersonMobile: string;

  @IsInt()
  @Min(1)
  numberOfStudents: number;
}

export class RegisterSchoolDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @Transform(normalizeDigits)
  @Matches(/^(?:\+?92|0)?3\d{9}$/, {
    message: 'phone must be a valid Pakistan mobile number',
  })
  phone?: string;

  @ValidateNested()
  @Type(() => InstitutionRegistrationDto)
  institution: InstitutionRegistrationDto;
}
