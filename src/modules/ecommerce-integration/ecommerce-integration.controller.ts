import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CardHolderProfileResponseDto } from './dto/card-holder-profile-response.dto';
import { EcommerceIntegrationService } from './ecommerce-integration.service';

@Controller('integrations/ecommerce')
@UseGuards(ApiKeyGuard)
export class EcommerceIntegrationController {
  constructor(
    private readonly ecommerceIntegrationService: EcommerceIntegrationService,
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
}
