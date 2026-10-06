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
  private replyTo?: string;
  /** Envelope MAIL FROM address (bounce address) — kept aligned with From. */
  private envelopeFrom?: string;

  constructor(private readonly config: ConfigService) {}

  /** Extracts the bare email address from a "Name <email>" string. */
  private addressOf(value?: string): string | undefined {
    if (!value) return undefined;
    const match = value.match(/<([^>]+)>/);
    return (match ? match[1] : value).trim() || undefined;
  }

  async onModuleInit(): Promise<void> {
    this.mailFrom = this.config.get<string>('MAIL_FROM')!;
    this.envelopeFrom = this.addressOf(this.mailFrom);
    this.replyTo =
      this.config.get<string>('MAIL_REPLY_TO') || this.envelopeFrom;
    const smtpHost = this.config.get<string>('SMTP_HOST');

    // DKIM-sign outgoing mail when a key is configured. This is one of the
    // biggest levers for landing in the inbox instead of spam.
    const dkimDomain = this.config.get<string>('DKIM_DOMAIN');
    const dkimSelector = this.config.get<string>('DKIM_SELECTOR');
    const dkimKey = this.config.get<string>('DKIM_PRIVATE_KEY');
    const dkim =
      dkimDomain && dkimSelector && dkimKey
        ? {
            domainName: dkimDomain,
            keySelector: dkimSelector,
            // Allow the key to be supplied with literal "\n" in env files.
            privateKey: dkimKey.replace(/\\n/g, '\n'),
          }
        : undefined;

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
        ...(dkim ? { dkim } : {}),
      });
      this.logger.log(
        `Email transport configured for SMTP host ${smtpHost}` +
          (dkim ? ' (DKIM signing enabled)' : ' (no DKIM key — set DKIM_* for better deliverability)'),
      );
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
      replyTo: this.replyTo,
      // Align the SMTP envelope (bounce) address with the From domain so SPF
      // checks pass on the visible From domain.
      ...(this.envelopeFrom
        ? { envelope: { from: this.envelopeFrom, to: options.to } }
        : {}),
      subject: options.subject,
      text: options.text,
      html: options.html,
      ...(options.attachments?.length
        ? { attachments: options.attachments }
        : {}),
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

  async sendAccountSetupEmail(
    to: string,
    name: string,
    roleLabel: string,
    setupLink: string,
    isReset = false,
  ): Promise<void> {
    const year = new Date().getFullYear();
    const heading = isReset
      ? 'Reset your password'
      : 'Welcome — set your password';
    const intro = isReset
      ? `A password reset was requested for your <strong>${roleLabel}</strong> account on the Student Smart Card system.`
      : `An administrator has created a <strong>${roleLabel}</strong> account for you on the Student Smart Card system. Set a password to activate it and sign in.`;
    const cta = isReset ? 'Reset Password' : 'Set Your Password';

    await this.sendMail({
      to,
      subject: isReset
        ? 'Reset your Student Smart Card password'
        : `Set up your Student Smart Card ${roleLabel} account`,
      text:
        `Hello ${name},\n\n` +
        (isReset
          ? `A password reset was requested for your ${roleLabel} account on the Student Smart Card system.`
          : `An administrator has created a ${roleLabel} account for you on the Student Smart Card system. Set a password to activate it and sign in.`) +
        `\n\nUse this link (valid for 7 days):\n${setupLink}\n\n` +
        `After signing in you can update your profile details at any time.\n\n` +
        `— Student Smart Card\n© ${year} Student Smart Card. This is an automated message.`,
      html: `
        <div style="margin:0;padding:24px 0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#0A1628;padding:24px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:0.3px;">Student&nbsp;Smart&nbsp;Card</span>
                <span style="color:#C9A84C;font-size:12px;font-weight:bold;display:block;margin-top:4px;letter-spacing:1.5px;text-transform:uppercase;">${heading}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#0A1628;line-height:1.6;font-size:14px;">
                <p style="margin:0 0 16px;">Hello ${name},</p>
                <p style="margin:0 0 24px;">${intro}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr><td style="border-radius:8px;background:#C9A84C;">
                    <a href="${setupLink}" style="display:inline-block;padding:12px 32px;color:#0A1628;text-decoration:none;font-weight:bold;font-size:14px;border-radius:8px;">${cta}</a>
                  </td></tr>
                </table>
                <p style="margin:0 0 6px;color:#64748b;font-size:12px;">Or open this link (valid for 7 days):</p>
                <p style="margin:0 0 20px;color:#475569;font-size:12px;word-break:break-all;">${setupLink}</p>
                <p style="margin:0;color:#64748b;font-size:12px;">After signing in you can update your profile details at any time.</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;color:#94a3b8;font-size:11px;line-height:1.5;">
                If you weren't expecting this, you can ignore this email.<br/>
                © ${year} Student Smart Card. All rights reserved.
              </td>
            </tr>
          </table>
        </div>
      `,
    });
  }

  async sendPaymentLinkEmail(
    to: string,
    name: string,
    trackLink: string,
    feeLabel?: string,
  ): Promise<void> {
    const feeLine = feeLabel ? ` of ${feeLabel}` : '';
    await this.sendMail({
      to,
      subject: 'Complete your Student Smart Card registration payment',
      text: `Hello ${name},\n\nYour Student Smart Card registration is ready for payment${feeLine}. Use the secure link below to view the payment details, pay, and track your application status:\n\n${trackLink}\n\nNo login is required. If you did not expect this, you can ignore this email.`,
      html: `
        <p>Hello ${name},</p>
        <p>Your Student Smart Card registration is ready for payment${feeLine}. Use the secure link below to view the payment details, pay, and track your application status — no login required.</p>
        <p style="margin:30px 0;">
          <a href="${trackLink}" style="background-color:#C9A84C;color:#0A1628;padding:12px 30px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">
            Pay &amp; Track Application
          </a>
        </p>
        <p style="color:#666;font-size:12px;">Or open this link: ${trackLink}</p>
        <p style="color:#666;font-size:12px;">If you did not expect this, you can ignore this email.</p>
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
      subject: 'Set your Student Smart Card password',
      text: `Hello ${studentName},\n\nUse the link below to set your Student Smart Card account password (works for first-time setup and password resets):\n\n${setupLink}\n\nThis link will expire in 7 days. If you did not request this, please ignore this email.`,
      html: `
        <p>Hello ${studentName},</p>
        <p>Use the button below to set your <strong>Student Smart Card</strong> account password. This works both for first-time setup and if you forgot your password.</p>
        <p style="margin:30px 0;">
          <a href="${setupLink}" style="background-color:#C9A84C;color:#0A1628;padding:12px 30px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">
            Set Your Password
          </a>
        </p>
        <p style="color:#666;font-size:12px;">Or open this link: ${setupLink}</p>
        <p style="color:#666;font-size:12px;">This link will expire in 7 days. If you did not request this, please ignore this email.</p>
      `,
    });
  }
}
