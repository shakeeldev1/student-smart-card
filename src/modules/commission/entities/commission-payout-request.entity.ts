import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CommissionPayoutRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CONFIRMED = 'confirmed',
}

@Entity('commission_payout_requests')
export class CommissionPayoutRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  channel: string;

  @Index()
  @Column({ type: 'uuid' })
  partnerId: string;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'varchar' })
  bankName: string;

  @Column({ type: 'varchar' })
  accountNumber: string;

  @Column({ type: 'varchar' })
  accountHolderName: string;

  @Column({ type: 'enum', enum: CommissionPayoutRequestStatus, default: CommissionPayoutRequestStatus.PENDING })
  status: CommissionPayoutRequestStatus;

  @Column({ type: 'varchar', nullable: true })
  adminNote: string | null;

  @Column({ type: 'varchar', nullable: true })
  paymentReference: string | null;

  @Column({ type: 'varchar', nullable: true })
  paymentProofUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  paymentProofPublicId: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedByUserId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
