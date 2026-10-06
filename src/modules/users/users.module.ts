import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Institution } from '../institutions/entities/institution.entity';
import { Student } from '../students/entities/student.entity';
import { Individual } from '../individuals/entities/individual.entity';
import { Employee } from '../corporate/entities/employee.entity';
import { Company } from '../corporate/entities/company.entity';
import { AreaManager } from '../area/entities/area-manager.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Institution,
      Student,
      Individual,
      Employee,
      Company,
      AreaManager,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
