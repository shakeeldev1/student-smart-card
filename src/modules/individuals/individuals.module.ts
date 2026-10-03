import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Individual } from './entities/individual.entity';
import { IndividualCard } from './entities/individual-card.entity';
import { IndividualsService } from './individuals.service';
import { IndividualsController } from './individuals.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { CardsModule } from '../cards/cards.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Individual, IndividualCard]),
    CloudinaryModule,
    CardsModule,
  ],
  controllers: [IndividualsController],
  providers: [IndividualsService],
  exports: [IndividualsService],
})
export class IndividualsModule {}
