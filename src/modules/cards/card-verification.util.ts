import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { CardStatus } from './enums/card-status.enum';

/**
 * Shared verification-code rules for student cards and individual cards, so
 * the public (/cards/*) and authenticated (/individuals/me/card/*) flows
 * behave identically.
 */

export const CARD_VALIDITY_MONTHS_DEFAULT = 12;
const CODE_TTL_MS = 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_VERIFICATION_ATTEMPTS = 5;

interface VerifiableCard {
  status: CardStatus;
  expiresAt: Date | null;
  verificationCode: string | null;
  verificationCodeExpiresAt: Date | null;
  verificationCodeSentAt: Date | null;
  verificationAttempts: number;
}

export function cardExpiryFrom(issuedAt: Date, months: number): Date {
  const expiresAt = new Date(issuedAt);
  expiresAt.setMonth(expiresAt.getMonth() + months);
  return expiresAt;
}

function isPastExpiry(card: VerifiableCard): boolean {
  return card.expiresAt !== null && new Date(card.expiresAt) < new Date();
}

/**
 * Validates the card may receive a code, then stamps a fresh one onto it
 * (caller persists the card and emails the code).
 */
export function issueVerificationCode(card: VerifiableCard): string {
  if (card.status === CardStatus.SUSPENDED) {
    throw new BadRequestException(
      'This card is suspended. Please contact support.',
    );
  }
  if (card.status === CardStatus.EXPIRED || isPastExpiry(card)) {
    throw new BadRequestException(
      'This card has expired. Please renew it before verifying.',
    );
  }
  if (
    card.verificationCodeSentAt &&
    Date.now() - new Date(card.verificationCodeSentAt).getTime() <
      RESEND_COOLDOWN_MS
  ) {
    throw new HttpException(
      'A code was sent less than a minute ago. Please wait before requesting another.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  const code = randomBytes(4).toString('hex').toUpperCase();
  card.verificationCode = code;
  card.verificationCodeExpiresAt = new Date(Date.now() + CODE_TTL_MS);
  card.verificationCodeSentAt = new Date();
  card.verificationAttempts = 0;
  return code;
}

/**
 * Checks a submitted code and mutates the card accordingly (caller persists
 * it either way — failed attempts are counted). Only a PENDING_VERIFICATION
 * card is promoted to ACTIVE; an already-active card stays active (so a
 * holder can re-verify for a partner such as SSC); suspended/expired cards
 * are never re-activated by a code.
 */
export function consumeVerificationCode(
  card: VerifiableCard,
  code: string,
): boolean {
  if (!card.verificationCode || !card.verificationCodeExpiresAt) {
    return false;
  }
  if (new Date() > new Date(card.verificationCodeExpiresAt)) {
    return false;
  }
  if (card.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
    // Too many wrong guesses: burn the code, the holder must request a new one.
    card.verificationCode = null;
    card.verificationCodeExpiresAt = null;
    return false;
  }
  if (
    card.status === CardStatus.SUSPENDED ||
    card.status === CardStatus.EXPIRED
  ) {
    return false;
  }
  if (isPastExpiry(card)) {
    card.status = CardStatus.EXPIRED;
    return false;
  }

  if (card.verificationCode !== code.trim().toUpperCase()) {
    card.verificationAttempts += 1;
    return false;
  }

  card.status = CardStatus.ACTIVE;
  card.verificationCode = null;
  card.verificationCodeExpiresAt = null;
  card.verificationAttempts = 0;
  return true;
}
