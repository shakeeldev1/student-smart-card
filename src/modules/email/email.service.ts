import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { OtpPurpose } from '../auth/enums/otp-purpose.enum';
import {
  EmailProvider,
  SendMailOptions,
} from './interfaces/email-provider.interface';

@Injectable()
export class NodemailerEmailService implements EmailProvider, OnModuleInit {
  private readonly logger = new Logger(NodemailerEmailService.name);
  private transporter: Transporter<SMTPTransport.SentMessageInfo>;
  private mailFrom: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.mailFrom = this.config.get<string>('MAIL_FROM')!;
    const smtpHost = this.config.get<string>('SMTP_HOST');

    if (smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.config.get<number>('SMTP_PORT'),
        secure: this.config.get<boolean>('SMTP_SECURE'),
        auth: this.config.get<string>('SMTP_USER')
          ? {
              user: this.config.get<string>('SMTP_USER'),
              pass: this.config.get<string>('SMTP_PASSWORD'),
            }
          : undefined,
      });
      this.logger.log(`Email transport configured for SMTP host ${smtpHost}`);
      return;
    }

    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new Error('SMTP_HOST must be configured in production');
    }

    const testAccount = await nodemailer.createTestAccount();
    this.transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    this.logger.warn(
      'SMTP_HOST not set — using an auto-generated Ethereal test inbox for development. ' +
        'Sent email preview URLs will be logged below.',
    );
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    const info = await this.transporter.sendMail({
      from: this.mailFrom,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      this.logger.log(`Email preview (${options.to}): ${previewUrl}`);
    }
  }

  async sendOtpEmail(
    to: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<void> {
    const isReset = purpose === OtpPurpose.PASSWORD_RESET;
    const subject = isReset
      ? 'Your password reset code'
      : 'Verify your email address';
    const intro = isReset
      ? 'Use the code below to reset your password.'
      : 'Use the code below to verify your email address.';

    await this.sendMail({
      to,
      subject,
      text: `${intro}\n\nYour code: ${code}\n\nThis code expires shortly. If you did not request this, you can ignore this email.`,
      html: `<p>${intro}</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p><p>This code expires shortly. If you did not request this, you can ignore this email.</p>`,
    });
  }

  async sendCardVerificationEmail(
    to: string,
    studentName: string,
    cardNumber: string,
    code: string,
  ): Promise<void> {
    await this.sendMail({
      to,
      subject: 'Verify your Student Smart Card',
      text:
        `Hello ${studentName},\n\nYour Student Smart Card (${cardNumber}) is ready to be verified before use.\n\nVerification code: ${code}\n\nUse this code to confirm the card belongs to you before it is activated for use.`,
      html: `
        <p>Hello ${studentName},</p>
        <p>Your Student Smart Card <strong>${cardNumber}</strong> is ready to be verified before use.</p>
        <p style="font-size:24px;font-weight:bold;letter-spacing:4px;margin:20px 0;">${code}</p>
        <p>Use this code to confirm the card belongs to you before it is activated for use.</p>
      `,
    });
  }

  async sendStudentSetupEmail(
    to: string,
    studentName: string,
    setupLink: string,
  ): Promise<void> {
    await this.sendMail({
      to,
      subject: 'Complete your Student Smart Card account setup',
      text: `Hello ${studentName},\n\nWelcome to Student Smart Card!\n\nTo complete your account setup and set your password, please click the link below:\n\n${setupLink}\n\nThis link will expire in 7 days. If you did not request this, please ignore this email.`,
      html: `
        <p>Hello ${studentName},</p>
        <p>Welcome to <strong>Student Smart Card</strong>!</p>
        <p>To complete your account setup and set your password, please click the button below:</p>
        <p style="margin:30px 0;">
          <a href="${setupLink}" style="background-color:#C9A84C;color:#0A1628;padding:12px 30px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">
            Set Your Password
          </a>
        </p>
        <p style="color:#666;font-size:12px;">This link will expire in 7 days. If you did not request this, please ignore this email.</p>
      `,
    });
  }
}
