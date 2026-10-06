import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Payload for emailing a generated Excel export to a recipient. The .xlsx
 * itself is uploaded as a multipart `file`; these are the accompanying fields.
 */
export class EmailExportDto {
  @IsEmail({}, { message: 'Enter a valid recipient email address' })
  to!: string;

  // What the sheet contains, e.g. "students" — used only to phrase the email.
  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;

  // How many records are in the sheet (multipart fields arrive as strings).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  recordCount?: number;

  // An optional free-text note from the sender, shown in the email body.
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
