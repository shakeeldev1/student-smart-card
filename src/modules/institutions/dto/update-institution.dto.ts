import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { InstitutionType } from '../enums/institution-type.enum';

export class UpdateInstitutionDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEnum(InstitutionType)
  type?: InstitutionType;

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
  @MaxLength(20)
  contactNumber?: string;

  @IsOptional()
  @IsEmail()
  officialEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  principalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  authorizedPersonName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  authorizedPersonDesignation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  authorizedPersonMobile?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfStudents?: number;
}
