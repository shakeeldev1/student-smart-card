import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { Student } from '../students/entities/student.entity';
import { Individual } from '../individuals/entities/individual.entity';
import { Employee } from '../corporate/entities/employee.entity';
import { FranchiseSettings } from '../area/entities/franchise-settings.entity';
import { CommissionRate } from './entities/commission-rate.entity';
import { CommissionPayout } from './entities/commission-payout.entity';
import { CommissionService } from './commission.service';
import { CommissionController } from './commission.controller';

/**
 * Commission ledger: snapshots a per-registration commission at payment
 * confirmation, tracks payouts, and resolves per-variant rate overrides.
 * Depends only on entities (no other feature module) so it can be imported by
 * payments / area / institutions / corporate without a dependency cycle.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Student,
      Individual,
      Employee,
      FranchiseSettings,
      CommissionRate,
      CommissionPayout,
    ]),
  ],
  providers: [CommissionService],
  controllers: [CommissionController],
  exports: [CommissionService],
})
export class CommissionModule {}
