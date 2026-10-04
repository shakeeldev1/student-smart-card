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

export class CreateEmployeeDto {
  @IsString()
  @MaxLength(150)
  fullName: string;

  @IsString()
  @MaxLength(150)
  fatherOrHusbandName: string;

  @Transform(normalizeDigits)
  @Matches(/^\d{13}$/, { message: 'cnicNumber must be a 13-digit number' })
  cnicNumber: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEnum(Gender)
  gender: Gender;

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

  // Required: the account-setup link and card verification codes go here.
  @IsEmail()
  email: string;

  // EFU takaful variant (1–10): sets coverage (×100,000) and fee (×1,000).
  @Type(() => Number)
  @IsInt()
  @Min(MIN_PRODUCT_VARIANT)
  @Max(MAX_PRODUCT_VARIANT)
  productVariant: number;

  @IsString()
  @MaxLength(150)
  nomineeName: string;

  @IsString()
  @MaxLength(60)
  nomineeRelationship: string;

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
