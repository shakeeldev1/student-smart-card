import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReviewDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  // Multipart fields arrive as strings — coerce to a number before validating.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;
}
