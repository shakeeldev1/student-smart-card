import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardStatus } from './enums/card-status.enum';

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post('send-verification-email/:studentId')
  async sendVerificationEmail(@Param('studentId') studentId: string) {
    return this.cardsService.sendVerificationEmail(studentId);
  }

  @Post('request-verification-code')
  async requestVerificationCode(
    @Body() body: { cardNumber: string },
  ): Promise<{ message: string }> {
    return this.cardsService.requestVerificationCodeByCardNumber(
      body.cardNumber,
    );
  }

  @Post('verify')
  async verify(@Body() body: { cardNumber: string; code: string }) {
    const result = await this.cardsService.verifyCard(
      body.cardNumber,
      body.code,
    );

    if (!result.valid) {
      return { valid: false };
    }

    const card = await this.cardsService.findByCardNumber(body.cardNumber);
    if (!card) {
      return { valid: false };
    }

    return {
      valid: true,
      cardNumber: card.cardNumber,
      status: card.status,
      eligibleForDiscount: card.status === CardStatus.ACTIVE,
      studentName: card.student.fullName,
      className: card.student.className,
      issuedAt: card.issuedAt,
    };
  }

  @Get('verify/:cardNumber')
  async verifyByNumber(@Param('cardNumber') cardNumber: string) {
    const card = await this.cardsService.findByCardNumber(cardNumber);
    if (!card) {
      return { valid: false };
    }

    return {
      valid: true,
      cardNumber: card.cardNumber,
      status: card.status,
      eligibleForDiscount: card.status === CardStatus.ACTIVE,
      studentName: card.student.fullName,
      className: card.student.className,
      issuedAt: card.issuedAt,
    };
  }
}
