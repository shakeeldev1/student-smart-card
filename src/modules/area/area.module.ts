import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaManager } from './entities/area-manager.entity';
import { FranchiseSettings } from './entities/franchise-settings.entity';
import { Institution } from '../institutions/entities/institution.entity';
import { Student } from '../students/entities/student.entity';
import { Individual } from '../individuals/entities/individual.entity';
import { UsersModule } from '../users/users.module';
import { AreaService } from './area.service';
import { AreaController } from './area.controller';
import { AreaAdminController } from './area-admin.controller';
import { CommissionModule } from '../commission/commission.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AreaManager,
      FranchiseSettings,
      Institution,
      Student,
      Individual,
    ]),
    UsersModule,
    CommissionModule,
  ],
  controllers: [AreaController, AreaAdminController],
  providers: [AreaService],
  exports: [AreaService],
})
export class AreaModule {}
