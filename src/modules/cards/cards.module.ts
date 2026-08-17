import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from './entities/card.entity';
import { IndividualCard } from '../individuals/entities/individual-card.entity';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Card, IndividualCard])],
  providers: [CardsService],
  controllers: [CardsController],
  exports: [CardsService],
})
export class CardsModule {}
