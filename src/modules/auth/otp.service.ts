import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomInt } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { EmailOtp } from './entities/email-otp.entity';
import { OtpPurpose } from './enums/otp-purpose.enum';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(EmailOtp)
    private readonly otpRepository: Repository<EmailOtp>,
    private readonly config: ConfigService,
  ) {}

  private hashCode(code: string): string {
    const pepper = this.config.get<string>('OTP_HASH_PEPPER');
    return createHash('sha256').update(`${code}${pepper}`).digest('hex');
  }

  private generateCode(): string {
    const length = this.config.get<number>('OTP_LENGTH')!;
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;
    return randomInt(min, max + 1)
      .toString()
      .padStart(length, '0');
  }

  async generate(userId: string, purpose: OtpPurpose): Promise<string> {
    await this.otpRepository.update(
      { userId, purpose, consumedAt: IsNull() },
      { consumedAt: new Date() },
    );

    const code = this.generateCode();
    const expiresInMinutes = this.config.get<number>('OTP_EXPIRES_IN_MINUTES')!;

    const otp = this.otpRepository.create({
      userId,
      purpose,
      codeHash: this.hashCode(code),
      expiresAt: new Date(Date.now() + expiresInMinutes * 60_000),
    });
    await this.otpRepository.save(otp);

    return code;
  }

  async verify(
    userId: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<void> {
    const maxAttempts = this.config.get<number>('OTP_MAX_ATTEMPTS')!;

    const otp = await this.otpRepository.findOne({
      where: { userId, purpose, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired code');
    }

    if (otp.attempts >= maxAttempts) {
      throw new HttpException(
        'Too many attempts. Please request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (otp.codeHash !== this.hashCode(code)) {
      otp.attempts += 1;
      await this.otpRepository.save(otp);

      if (otp.attempts >= maxAttempts) {
        throw new HttpException(
          'Too many attempts. Please request a new code.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new BadRequestException('Invalid or expired code');
    }

    otp.consumedAt = new Date();
    await this.otpRepository.save(otp);
  }
}
