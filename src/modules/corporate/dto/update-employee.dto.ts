import { Transform, Type } from 'class-transformer';
import {
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
import { normalizeDigits } from '../../../common/transforms/normalize-digits.transform';
import {
  MAX_PRODUCT_VARIANT,
  MIN_PRODUCT_VARIANT,
} from '../../../common/insurance/coverage.util';

/** All fields optional. Company + admin may edit, including the nominee. */
export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  fatherOrHusbandName?: string;

  @IsOptional()
  @Transform(normalizeDigits)
  @Matches(/^\d{13}$/, { message: 'cnicNumber must be a 13-digit number' })
  cnicNumber?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  employeeCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  designation?: string;

  @IsOptional()
  @IsDateString()
  joiningDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  branchLocation?: string;

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
  @Type(() => Number)
  @IsInt()
  @Min(MIN_PRODUCT_VARIANT)
  @Max(MAX_PRODUCT_VARIANT)
  productVariant?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nomineeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  nomineeRelationship?: string;

  @IsOptional()
  @Transform(normalizeDigits)
  @Matches(/^\d{13}$/, { message: 'nomineeCnic must be a 13-digit number' })
  nomineeCnic?: string;

  @IsOptional()
  @IsDateString()
  nomineeDateOfBirth?: string;

  @IsOptional()
  @Transform(normalizeDigits)
  @Matches(/^(?:\+?92|0)?3\d{9}$/, {
    message: 'nomineeMobile must be a valid Pakistan mobile number',
  })
  nomineeMobile?: string;
}
