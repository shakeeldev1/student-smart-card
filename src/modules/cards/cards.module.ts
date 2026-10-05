import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from './entities/card.entity';
import { IndividualCard } from '../individuals/entities/individual-card.entity';
import { EmployeeCard } from '../corporate/entities/employee-card.entity';
import { Student } from '../students/entities/student.entity';
import { GoldenCardNumber } from './entities/golden-card-number.entity';
import { CardsService } from './cards.service';
import { GoldenNumbersService } from './golden-numbers.service';
import { CardsController } from './cards.controller';
import { GoldenNumbersController } from './golden-numbers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Card,
      IndividualCard,
      EmployeeCard,
      Student,
      GoldenCardNumber,
    ]),
  ],
  providers: [CardsService, GoldenNumbersService],
  controllers: [CardsController, GoldenNumbersController],
  exports: [CardsService],
})
export class CardsModule {}
