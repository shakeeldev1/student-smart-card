import { IsEmail, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail()
  email: string;

  @Matches(/^\d{4,8}$/, { message: 'code must be a numeric OTP code' })
  code: string;
}
