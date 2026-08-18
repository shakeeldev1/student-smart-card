import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { normalizeDigits } from '../../../common/transforms/normalize-digits.transform';

export class UpdateOwnStudentProfileDto {
  @IsOptional()
  @Transform(normalizeDigits)
  @Matches(/^(?:\+?92|0)?3\d{9}$/, {
    message: 'contactNumber must be a valid Pakistan mobile number',
  })
  contactNumber?: string;

  @IsOptional()
  @Transform(normalizeDigits)
  @Matches(/^(?:\+?92|0)?3\d{9}$/, {
    message: 'guardianMobile must be a valid Pakistan mobile number',
  })
  guardianMobile?: string;

  @IsOptional()
  @IsEmail()
  guardianEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  guardianAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  guardianCity?: string;
}
