import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AreaLevel } from '../enums/area-level.enum';

/**
 * Admin payload to provision an area manager. `province` is always required;
 * `region` / `district` / `tehsil` are required as the level deepens — that
 * cross-field rule is enforced in the service so the message is specific.
 */
export class CreateAreaManagerDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(AreaLevel)
  level: AreaLevel;

  @IsString()
  @MinLength(1)
  province: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  tehsil?: string;
}
