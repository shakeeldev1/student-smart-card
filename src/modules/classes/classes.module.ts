import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolClass } from './entities/school-class.entity';
import { Section } from './entities/section.entity';
import { Student } from '../students/entities/student.entity';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { SectionsService } from './sections.service';
import { SectionsController } from './sections.controller';
import { InstitutionsModule } from '../institutions/institutions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SchoolClass, Section, Student]),
    InstitutionsModule,
  ],
  controllers: [ClassesController, SectionsController],
  providers: [ClassesService, SectionsService],
  exports: [ClassesService, SectionsService],
})
export class ClassesModule {}
