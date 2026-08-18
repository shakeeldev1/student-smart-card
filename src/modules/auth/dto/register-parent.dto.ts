import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizeDigits } from '../../../common/transforms/normalize-digits.transform';

export class RegisterParentDto {
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
}
