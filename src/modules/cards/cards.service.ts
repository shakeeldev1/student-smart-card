import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Inject } from '@nestjs/common';
import { Card } from './entities/card.entity';
import { IndividualCard } from '../individuals/entities/individual-card.entity';
import { CardStatus } from './enums/card-status.enum';
import {
  CARD_VALIDITY_MONTHS_DEFAULT,
  cardExpiryFrom,
  consumeVerificationCode,
  issueVerificationCode,
} from './card-verification.util';
import {
  EMAIL_SERVICE,
  type EmailProvider,
} from '../email/interfaces/email-provider.interface';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';

export interface CardLookupResult {
  cardNumber: string;
  status: CardStatus;
  holderName: string;
  className: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
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
    private readonly config: ConfigService,
  ) {}

  /** Expiry for a card issued now, per CARD_VALIDITY_MONTHS. */
  newCardExpiry(issuedAt: Date): Date {
    const months =
      Number(this.config.get('CARD_VALIDITY_MONTHS')) ||
      CARD_VALIDITY_MONTHS_DEFAULT;
    return cardExpiryFrom(issuedAt, months);
  }

  async issueForStudent(studentId: string): Promise<Card> {
    const existing = await this.cardsRepository.findOne({
      where: { studentId },
    });
    if (existing) {
      return existing;
    }

    const issuedAt = new Date();
    const card = this.cardsRepository.create({
      studentId,
      cardNumber: `CARD-${randomBytes(4).toString('hex').toUpperCase()}`,
      status: CardStatus.PENDING_VERIFICATION,
      issuedAt,
      expiresAt: this.newCardExpiry(issuedAt),
    });
    return this.cardsRepository.save(card);
  }

  /** Used when a student's application is rejected after a card exists. */
  async suspendForStudent(studentId: string): Promise<void> {
    const card = await this.cardsRepository.findOne({ where: { studentId } });
    if (card && card.status !== CardStatus.SUSPENDED) {
      card.status = CardStatus.SUSPENDED;
      card.verificationCode = null;
      card.verificationCodeExpiresAt = null;
      await this.cardsRepository.save(card);
    }
  }

  async sendVerificationEmail(
    currentUser: JwtPayload,
    studentId: string,
  ): Promise<{ message: string }> {
    const card = await this.cardsRepository.findOne({
      where: { studentId },
      relations: { student: { institution: true } },
    });

    if (!card) {
      throw new NotFoundException('Card not found for this student');
    }

    this.assertCanManageStudentCard(currentUser, card);

    if (!card.student?.email) {
      throw new BadRequestException(
        'Student email is required before card verification can be sent',
      );
    }

    const code = issueVerificationCode(card);
    await this.cardsRepository.save(card);

    await this.emailService.sendCardVerificationEmail(
      card.student.email,
      card.student.fullName,
      card.cardNumber,
      code,
    );

    return { message: 'Verification email sent successfully' };
  }

  /**
   * The student themselves, their school, or staff. Previously this
   * endpoint was unauthenticated, letting anyone trigger emails for any
   * student id.
   */
  private assertCanManageStudentCard(currentUser: JwtPayload, card: Card) {
    const student = card.student;
    const isStaff =
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.OPERATOR;
    const isHolder = Boolean(student?.userId) && student.userId === currentUser.sub;
    const isOwningSchool =
      currentUser.role === UserRole.SCHOOL &&
      student?.institution?.ownerUserId === currentUser.sub;
    if (!isStaff && !isHolder && !isOwningSchool) {
      throw new ForbiddenException('You cannot manage this card');
    }
  }

  private async findAnyCardByNumber(cardNumber: string): Promise<
    | { kind: 'student'; card: Card }
    | { kind: 'individual'; card: IndividualCard }
    | null
  > {
    const normalized = cardNumber?.trim().toUpperCase();
    if (!normalized) {
      return null;
    }

    const studentCard = await this.cardsRepository.findOne({
      where: { cardNumber: normalized },
      relations: { student: true },
    });
    if (studentCard) {
      return { kind: 'student', card: studentCard };
    }

    const individualCard = await this.individualCardsRepository.findOne({
      where: { cardNumber: normalized },
      relations: { individual: { user: true } },
    });
    if (individualCard) {
      return { kind: 'individual', card: individualCard };
    }

    return null;
  }

  private async saveMatch(
    match:
      | { kind: 'student'; card: Card }
      | { kind: 'individual'; card: IndividualCard },
  ): Promise<void> {
    if (match.kind === 'student') {
      await this.cardsRepository.save(match.card);
    } else {
      await this.individualCardsRepository.save(match.card);
    }
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
        : // Individuals register themselves, so their login email is a
          // reliable fallback when the application's email field is blank.
          (match.card.individual?.email ?? match.card.individual?.user?.email);
    const holderName =
      match.kind === 'student'
        ? match.card.student?.fullName
        : match.card.individual?.fullName;

    if (!holderEmail) {
      throw new BadRequestException(
        'No email address on file for this card. Ask your school (or support) to add one.',
      );
    }

    const code = issueVerificationCode(match.card);
    await this.saveMatch(match);

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
    if (!match || typeof code !== 'string' || !code.trim()) {
      return { valid: false };
    }

    const valid = consumeVerificationCode(match.card, code);
    // Persist either way: failed attempts are counted.
    await this.saveMatch(match);
    return { valid };
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
        expiresAt: match.card.expiresAt,
      };
    }

    return {
      cardNumber: match.card.cardNumber,
      status: match.card.status,
      holderName: match.card.individual?.fullName ?? '',
      className: null,
      issuedAt: match.card.issuedAt,
      expiresAt: match.card.expiresAt,
    };
  }
}
