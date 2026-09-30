import { Transform, Type } from 'class-transformer';
import {
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
import { NomineeRelationship } from '../enums/nominee-relationship.enum';
import { normalizeDigits } from '../../../common/transforms/normalize-digits.transform';
import {
  MAX_PRODUCT_VARIANT,
  MIN_PRODUCT_VARIANT,
} from '../../../common/insurance/coverage.util';

export class UpdateIndividualApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  fatherName?: string;

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
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

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
  @IsEnum(NomineeRelationship)
  nomineeRelationship?: NomineeRelationship;

  @IsOptional()
  @Transform(normalizeDigits)
  @Matches(/^\d{13}$/, { message: 'nomineeCnic must be a 13-digit number' })
  nomineeCnic?: string;

  @IsOptional()
  @Transform(normalizeDigits)
  @Matches(/^(?:\+?92|0)?3\d{9}$/, {
    message: 'nomineeMobile must be a valid Pakistan mobile number',
  })
  nomineeMobile?: string;

  @IsOptional()
  @IsEmail()
  nomineeEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  nomineeAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nomineeCity?: string;
}
