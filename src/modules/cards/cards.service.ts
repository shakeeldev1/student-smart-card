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
import { IndividualCard } from '../individuals/entities/individual-card.entity';
import { CardStatus } from './enums/card-status.enum';
import {
  EMAIL_SERVICE,
  type EmailProvider,
} from '../email/interfaces/email-provider.interface';

export interface CardLookupResult {
  cardNumber: string;
  status: CardStatus;
  holderName: string;
  className: string | null;
  issuedAt: Date;
}

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,
    @InjectRepository(IndividualCard)
    private readonly individualCardsRepository: Repository<IndividualCard>,
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

  private async findAnyCardByNumber(cardNumber: string): Promise<
    | { kind: 'student'; card: Card }
    | { kind: 'individual'; card: IndividualCard }
    | null
  > {
    const studentCard = await this.cardsRepository.findOne({
      where: { cardNumber },
      relations: { student: true },
    });
    if (studentCard) {
      return { kind: 'student', card: studentCard };
    }

    const individualCard = await this.individualCardsRepository.findOne({
      where: { cardNumber },
      relations: { individual: true },
    });
    if (individualCard) {
      return { kind: 'individual', card: individualCard };
    }

    return null;
  }

  async requestVerificationCodeByCardNumber(
    cardNumber: string,
  ): Promise<{ message: string }> {
    const match = await this.findAnyCardByNumber(cardNumber);

    if (!match) {
      throw new NotFoundException('Card not found');
    }

    const holderEmail =
      match.kind === 'student'
        ? match.card.student?.email
        : match.card.individual?.email;
    const holderName =
      match.kind === 'student'
        ? match.card.student?.fullName
        : match.card.individual?.fullName;

    if (!holderEmail) {
      throw new BadRequestException(
        'No email address on file for this card',
      );
    }

    const code = randomBytes(4).toString('hex').toUpperCase();
    match.card.verificationCode = code;
    match.card.verificationCodeExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    if (match.kind === 'student') {
      await this.cardsRepository.save(match.card);
    } else {
      await this.individualCardsRepository.save(match.card);
    }

    await this.emailService.sendCardVerificationEmail(
      holderEmail,
      holderName ?? '',
      match.card.cardNumber,
      code,
    );

    return { message: 'Verification code sent to your email address' };
  }

  async verifyCard(cardNumber: string, code: string): Promise<{ valid: boolean }> {
    const match = await this.findAnyCardByNumber(cardNumber);

    if (!match) {
      return { valid: false };
    }

    const { card } = match;
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

    if (match.kind === 'student') {
      await this.cardsRepository.save(card);
    } else {
      await this.individualCardsRepository.save(card);
    }

    return { valid: true };
  }

  async findByCardNumber(cardNumber: string): Promise<Card | null> {
    return this.cardsRepository.findOne({
      where: { cardNumber },
      relations: { student: true },
    });
  }

  async lookupByCardNumber(cardNumber: string): Promise<CardLookupResult | null> {
    const match = await this.findAnyCardByNumber(cardNumber);
    if (!match) {
      return null;
    }

    if (match.kind === 'student') {
      return {
        cardNumber: match.card.cardNumber,
        status: match.card.status,
        holderName: match.card.student?.fullName ?? '',
        className: match.card.student?.className ?? null,
        issuedAt: match.card.issuedAt,
      };
    }

    return {
      cardNumber: match.card.cardNumber,
      status: match.card.status,
      holderName: match.card.individual?.fullName ?? '',
      className: null,
      issuedAt: match.card.issuedAt,
    };
  }
}
