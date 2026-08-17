import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolClass } from './entities/school-class.entity';
import { Student } from '../students/entities/student.entity';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { InstitutionsModule } from '../institutions/institutions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SchoolClass, Student]),
    InstitutionsModule,
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
