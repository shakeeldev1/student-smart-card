import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institution } from '../institutions/entities/institution.entity';
import { SchoolClass } from '../classes/entities/school-class.entity';
import { Student } from '../students/entities/student.entity';
import { EfuService } from './efu.service';
import { EfuController } from './efu.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Institution, SchoolClass, Student])],
  controllers: [EfuController],
  providers: [EfuService],
})
export class EfuModule {}
