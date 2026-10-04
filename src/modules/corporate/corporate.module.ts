import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { Employee } from './entities/employee.entity';
import { EmployeeCard } from './entities/employee-card.entity';
import { Payment } from '../payments/entities/payment.entity';
import { CompaniesService } from './companies.service';
import { EmployeesService } from './employees.service';
import { CompaniesController } from './companies.controller';
import { EmployeesController } from './employees.controller';
import { CardsModule } from '../cards/cards.module';
import { PaymentsModule } from '../payments/payments.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, Employee, EmployeeCard, Payment]),
    CardsModule,
    PaymentsModule,
    CloudinaryModule,
  ],
  providers: [CompaniesService, EmployeesService],
  controllers: [CompaniesController, EmployeesController],
  exports: [CompaniesService, EmployeesService],
})
export class CorporateModule {}
