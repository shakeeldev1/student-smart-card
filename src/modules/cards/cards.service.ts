import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Inject } from '@nestjs/common';
import { Card } from './entities/card.entity';
import { CardStatus } from './enums/card-status.enum';
import {
  EMAIL_SERVICE,
  type EmailProvider,
} from '../email/interfaces/email-provider.interface';

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: EmailProvider,
  ) {}

  async issueForStudent(studentId: string): Promise<Card> {
    const existing = await this.cardsRepository.findOne({
      where: { studentId },
    });
    if (existing) {
      return existing;
    }

    const card = this.cardsRepository.create({
      studentId,
      cardNumber: `CARD-${randomBytes(4).toString('hex').toUpperCase()}`,
      status: CardStatus.PENDING_VERIFICATION,
      issuedAt: new Date(),
    });
    return this.cardsRepository.save(card);
  }

  async sendVerificationEmail(studentId: string): Promise<{ message: string }> {
    const card = await this.cardsRepository.findOne({
      where: { studentId },
      relations: { student: true },
    });

    if (!card) {
      throw new NotFoundException('Card not found for this student');
    }

    if (!card.student?.email) {
      throw new BadRequestException(
        'Student email is required before card verification can be sent',
      );
    }

    const code = randomBytes(4).toString('hex').toUpperCase();
    card.verificationCode = code;
    card.verificationCodeExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.cardsRepository.save(card);

    await this.emailService.sendCardVerificationEmail(
      card.student.email,
      card.student.fullName,
      card.cardNumber,
      code,
    );

    return { message: 'Verification email sent successfully' };
  }

  async requestVerificationCodeByCardNumber(
    cardNumber: string,
  ): Promise<{ message: string }> {
    const card = await this.cardsRepository.findOne({
      where: { cardNumber },
      relations: { student: true },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    if (!card.student?.email) {
      throw new BadRequestException(
        'No email address on file for this card',
      );
    }

    const code = randomBytes(4).toString('hex').toUpperCase();
    card.verificationCode = code;
    card.verificationCodeExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.cardsRepository.save(card);

    await this.emailService.sendCardVerificationEmail(
      card.student.email,
      card.student.fullName,
      card.cardNumber,
      code,
    );

    return { message: 'Verification code sent to your email address' };
  }

  async verifyCard(cardNumber: string, code: string): Promise<{ valid: boolean }> {
    const card = await this.cardsRepository.findOne({
      where: { cardNumber },
      relations: { student: true },
    });

    if (!card) {
      return { valid: false };
    }

    if (!card.verificationCode || !card.verificationCodeExpiresAt) {
      return { valid: false };
    }

    if (new Date() > new Date(card.verificationCodeExpiresAt)) {
      return { valid: false };
    }

    const isValid = card.verificationCode === code.trim().toUpperCase();
    if (!isValid) {
      return { valid: false };
    }

    card.status = CardStatus.ACTIVE;
    card.verificationCode = null;
    card.verificationCodeExpiresAt = null;
    await this.cardsRepository.save(card);

    return { valid: true };
  }

  async findByCardNumber(cardNumber: string): Promise<Card | null> {
    return this.cardsRepository.findOne({
      where: { cardNumber },
      relations: { student: true },
    });
  }
}
