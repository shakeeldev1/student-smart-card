import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { InstitutionsModule } from '../institutions/institutions.module';
import { CardsModule } from '../cards/cards.module';
import { ClassesModule } from '../classes/classes.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Student]),
    InstitutionsModule,
    CardsModule,
    ClassesModule,
    CloudinaryModule,
  ],
  providers: [StudentsService],
  controllers: [StudentsController],
  exports: [StudentsService],
})
export class StudentsModule {}
