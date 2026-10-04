import { Transform } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { normalizeDigits } from '../../../common/transforms/normalize-digits.transform';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

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
  @Transform(normalizeDigits)
  @Matches(/^(?:\+?92|0)\d{9,10}$/, {
    message: 'contactNumber must be a valid Pakistan phone number',
  })
  contactNumber?: string;

  @IsOptional()
  @IsEmail()
  officialEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  hrPersonName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  authorizedPersonDesignation?: string;

  @IsOptional()
  @Transform(normalizeDigits)
  @Matches(/^(?:\+?92|0)?3\d{9}$/, {
    message: 'authorizedPersonMobile must be a valid Pakistan mobile number',
  })
  authorizedPersonMobile?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfEmployees?: number;
}

export class ReviewReasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
