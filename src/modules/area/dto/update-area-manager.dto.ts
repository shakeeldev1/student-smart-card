import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AreaLevel } from '../enums/area-level.enum';

/**
 * Admin edit of an existing area manager: contact details, active status, and
 * (optionally) a reassignment of the level + area. When `level` is supplied
 * the geo columns are re-validated for that level; scope is read per-request,
 * so the change takes effect immediately.
 */
export class UpdateAreaManagerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(AreaLevel)
  level?: AreaLevel;

  @IsOptional()
  @IsString()
  province?: string;

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
