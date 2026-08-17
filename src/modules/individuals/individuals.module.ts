import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Individual } from './entities/individual.entity';
import { IndividualCard } from './entities/individual-card.entity';
import { IndividualsService } from './individuals.service';
import { IndividualsController } from './individuals.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Individual, IndividualCard])],
  controllers: [IndividualsController],
  providers: [IndividualsService],
  exports: [IndividualsService],
})
export class IndividualsModule {}
