import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from '../cards/entities/card.entity';
import { IndividualCard } from '../individuals/entities/individual-card.entity';
import { EcommerceIntegrationController } from './ecommerce-integration.controller';
import { EcommerceIntegrationService } from './ecommerce-integration.service';

@Module({
  imports: [TypeOrmModule.forFeature([Card, IndividualCard])],
  controllers: [EcommerceIntegrationController],
  providers: [EcommerceIntegrationService],
})
export class EcommerceIntegrationModule {}
