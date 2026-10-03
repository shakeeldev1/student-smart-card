import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institution } from '../institutions/entities/institution.entity';
import { SchoolClass } from '../classes/entities/school-class.entity';
import { Student } from '../students/entities/student.entity';
import { Individual } from '../individuals/entities/individual.entity';
import { Payment } from '../payments/entities/payment.entity';
import { StudentsModule } from '../students/students.module';
import { IndividualsModule } from '../individuals/individuals.module';
import { PaymentsModule } from '../payments/payments.module';
import { EfuService } from './efu.service';
import { EfuController } from './efu.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Institution, SchoolClass, Student, Individual, Payment]),
    StudentsModule,
    IndividualsModule,
    PaymentsModule,
  ],
  controllers: [EfuController],
  providers: [EfuService],
})
export class EfuModule {}
