import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from '../cards/entities/card.entity';
import { CardsModule } from '../cards/cards.module';
import { IndividualCard } from '../individuals/entities/individual-card.entity';
import { EcommerceIntegrationController } from './ecommerce-integration.controller';
import { EcommerceIntegrationService } from './ecommerce-integration.service';

@Module({
  imports: [TypeOrmModule.forFeature([Card, IndividualCard]), CardsModule],
  controllers: [EcommerceIntegrationController],
  providers: [EcommerceIntegrationService],
})
export class EcommerceIntegrationModule {}
