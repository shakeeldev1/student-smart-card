import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CardsService } from './cards.service';
import { CardStatus } from './enums/card-status.enum';

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get('verify/:cardNumber')
  @UseGuards(ApiKeyGuard)
  async verify(@Param('cardNumber') cardNumber: string) {
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
