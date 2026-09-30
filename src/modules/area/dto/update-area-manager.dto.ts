import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Admin edit of an existing area manager. The assigned area itself is
 * intentionally not editable here (create a new manager for a different area)
 * — only contact details and active status change.
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
}
