import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternshipApplication } from './entities/internship-application.entity';
import { InternshipsController } from './internships.controller';
import { InternshipsService } from './internships.service';

@Module({
  imports: [TypeOrmModule.forFeature([InternshipApplication])],
  controllers: [InternshipsController],
  providers: [InternshipsService],
  exports: [InternshipsService],
})
export class InternshipsModule {}
