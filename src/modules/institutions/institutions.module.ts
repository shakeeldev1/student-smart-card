import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institution } from './entities/institution.entity';
import { Student } from '../students/entities/student.entity';
import { InstitutionsService } from './institutions.service';
import { InstitutionsController } from './institutions.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { CommissionModule } from '../commission/commission.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Institution, Student]),
    CloudinaryModule,
    CommissionModule,
  ],
  providers: [InstitutionsService],
  controllers: [InstitutionsController],
  exports: [InstitutionsService],
})
export class InstitutionsModule {}
