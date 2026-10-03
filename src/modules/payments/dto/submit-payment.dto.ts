import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitPaymentDto {
  /** Optional payer reference: sender name, bank transaction id, etc. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}
