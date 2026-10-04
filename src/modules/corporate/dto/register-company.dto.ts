import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { normalizeDigits } from '../../../common/transforms/normalize-digits.transform';

export class CompanyRegistrationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  registrationNumber: string;

  @IsString()
  @MaxLength(300)
  address: string;

  @IsString()
  @MaxLength(100)
  city: string;

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

  @Transform(normalizeDigits)
  @Matches(/^(?:\+?92|0)\d{9,10}$/, {
    message: 'contactNumber must be a valid Pakistan phone number',
  })
  contactNumber: string;

  @IsEmail()
  officialEmail: string;

  @IsString()
  @MaxLength(120)
  hrPersonName: string;

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
  numberOfEmployees: number;
}

export class RegisterCompanyDto {
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
  @Type(() => CompanyRegistrationDto)
  company: CompanyRegistrationDto;
}
