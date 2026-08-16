import { OtpPurpose } from '../../auth/enums/otp-purpose.enum';

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailProvider {
  sendOtpEmail(to: string, code: string, purpose: OtpPurpose): Promise<void>;
  sendCardVerificationEmail(
    to: string,
    studentName: string,
    cardNumber: string,
    code: string,
  ): Promise<void>;
  sendMail(options: SendMailOptions): Promise<void>;
}

export const EMAIL_SERVICE = 'EMAIL_SERVICE';
