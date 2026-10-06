import { OtpPurpose } from '../../auth/enums/otp-purpose.enum';

export interface MailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: MailAttachment[];
}

export interface EmailProvider {
  sendOtpEmail(to: string, code: string, purpose: OtpPurpose): Promise<void>;
  sendCardVerificationEmail(
    to: string,
    studentName: string,
    cardNumber: string,
    code: string,
  ): Promise<void>;
  sendStudentSetupEmail(
    to: string,
    studentName: string,
    setupLink: string,
  ): Promise<void>;
  sendAccountSetupEmail(
    to: string,
    name: string,
    roleLabel: string,
    setupLink: string,
    isReset?: boolean,
  ): Promise<void>;
  sendPaymentLinkEmail(
    to: string,
    name: string,
    trackLink: string,
    feeLabel?: string,
  ): Promise<void>;
  sendMail(options: SendMailOptions): Promise<void>;
}

export const EMAIL_SERVICE = 'EMAIL_SERVICE';
