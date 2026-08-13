import { Type } from 'class-transformer';
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

  @IsString()
  @MaxLength(20)
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

  @Matches(/^\d{13}$/, {
    message: 'authorizedPersonCnic must be a 13-digit number',
  })
  authorizedPersonCnic: string;

  @IsString()
  @MaxLength(20)
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
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ValidateNested()
  @Type(() => InstitutionRegistrationDto)
  institution: InstitutionRegistrationDto;
}
