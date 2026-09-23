import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CardsService } from '../cards/cards.service';
import { CardHolderProfileResponseDto } from './dto/card-holder-profile-response.dto';
import { EcommerceIntegrationService } from './ecommerce-integration.service';

class IntegrationVerifyCodeDto {
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  code: string;
}

/**
 * Server-to-server surface for SSC. All calls come from SSC's server IP, so
 * the per-IP throttler is skipped here (it would otherwise rate-limit every
 * SSC user together); the API key authenticates the caller and the per-card
 * attempt counter in CardsService still stops code brute-forcing.
 */
@Controller('integrations/ecommerce')
@UseGuards(ApiKeyGuard)
@SkipThrottle()
export class EcommerceIntegrationController {
  constructor(
    private readonly ecommerceIntegrationService: EcommerceIntegrationService,
    private readonly cardsService: CardsService,
  ) {}

  @Get('cards/:cardNumber/profile')
  async getCardProfile(
    @Param('cardNumber') cardNumber: string,
  ): Promise<CardHolderProfileResponseDto> {
    const profile =
      await this.ecommerceIntegrationService.getActiveCardHolderProfile(
        cardNumber,
      );

    if (!profile) {
      throw new NotFoundException('Card not found or not active');
    }

    return profile;
  }

  @Post('cards/:cardNumber/request-verification-code')
  @HttpCode(HttpStatus.OK)
  requestVerificationCode(@Param('cardNumber') cardNumber: string) {
    return this.cardsService.requestVerificationCodeByCardNumber(cardNumber);
  }

  @Post('cards/:cardNumber/verify')
  @HttpCode(HttpStatus.OK)
  verify(
    @Param('cardNumber') cardNumber: string,
    @Body() body: IntegrationVerifyCodeDto,
  ): Promise<{ valid: boolean }> {
    return this.cardsService.verifyCard(cardNumber, body.code);
  }
}
