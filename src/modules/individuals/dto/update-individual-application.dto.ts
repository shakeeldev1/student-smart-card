import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { NomineeRelationship } from '../enums/nominee-relationship.enum';
import { normalizeDigits } from '../../../common/transforms/normalize-digits.transform';

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
  @IsString()
  @MaxLength(20)
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
