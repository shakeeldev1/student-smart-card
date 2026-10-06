import { IsString, MinLength } from 'class-validator';

/**
 * Generic password-setup for an admin-provisioned staff account, via the
 * one-time token emailed to the user. Also used for an admin-triggered reset.
 */
export class SetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
