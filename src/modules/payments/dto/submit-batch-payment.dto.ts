import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * A combined payment for several students in one transfer. `studentIds` arrives
 * as a multipart field, so it may come through as a JSON string or repeated
 * field — normalise both to a string[].
 */
export class SubmitBatchPaymentDto {
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return value.split(',').map((v) => v.trim()).filter(Boolean);
      }
    }
    return value;
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  studentIds: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}
