import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaManager } from './entities/area-manager.entity';
import { Institution } from '../institutions/entities/institution.entity';
import { Student } from '../students/entities/student.entity';
import { UsersModule } from '../users/users.module';
import { AreaService } from './area.service';
import { AreaController } from './area.controller';
import { AreaAdminController } from './area-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AreaManager, Institution, Student]),
    UsersModule,
  ],
  controllers: [AreaController, AreaAdminController],
  providers: [AreaService],
  exports: [AreaService],
})
export class AreaModule {}
