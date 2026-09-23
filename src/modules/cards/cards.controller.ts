import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CardsService } from './cards.service';
import { CardStatus } from './enums/card-status.enum';

// These two endpoints are public (Track Card page + the SSC integration), so
// they get a tight per-IP limit on top of the per-card attempt counter.
const CARD_CODE_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

class RequestVerificationCodeDto {
  @IsString()
  @MinLength(4)
  @MaxLength(40)
  cardNumber: string;
}

class VerifyCardDto extends RequestVerificationCodeDto {
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  code: string;
}

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post('send-verification-email/:studentId')
  @UseGuards(JwtAuthGuard)
  @Throttle(CARD_CODE_THROTTLE)
  async sendVerificationEmail(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.cardsService.sendVerificationEmail(user, studentId);
  }

  @Post('request-verification-code')
  @Throttle(CARD_CODE_THROTTLE)
  async requestVerificationCode(
    @Body() body: RequestVerificationCodeDto,
  ): Promise<{ message: string }> {
    return this.cardsService.requestVerificationCodeByCardNumber(
      body.cardNumber,
    );
  }

  @Post('verify')
  @Throttle(CARD_CODE_THROTTLE)
  async verify(@Body() body: VerifyCardDto) {
    const result = await this.cardsService.verifyCard(
      body.cardNumber,
      body.code,
    );

    if (!result.valid) {
      return { valid: false };
    }

    const card = await this.cardsService.lookupByCardNumber(body.cardNumber);
    if (!card) {
      return { valid: false };
    }

    return {
      valid: true,
      cardNumber: card.cardNumber,
      status: card.status,
      eligibleForDiscount: card.status === CardStatus.ACTIVE,
      studentName: card.holderName,
      className: card.className,
      issuedAt: card.issuedAt,
      expiresAt: card.expiresAt,
    };
  }

  @Get('verify/:cardNumber')
  async verifyByNumber(@Param('cardNumber') cardNumber: string) {
    const card = await this.cardsService.lookupByCardNumber(cardNumber);
    if (!card) {
      return { valid: false };
    }

    return {
      valid: true,
      cardNumber: card.cardNumber,
      status: card.status,
      eligibleForDiscount: card.status === CardStatus.ACTIVE,
      studentName: card.holderName,
      className: card.className,
      issuedAt: card.issuedAt,
      expiresAt: card.expiresAt,
    };
  }
}
