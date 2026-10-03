import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Individual } from '../../individuals/entities/individual.entity';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

/**
 * A registration payment for one application (student OR individual). The amount
 * is derived from the application's product variant (variant × 1,000). Manual
 * bank-transfer today; `gateway*` fields are reserved for a future online
 * gateway so the lifecycle never has to change.
 */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  studentId: string | null;

  @ManyToOne(() => Student, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'studentId' })
  student?: Student | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  individualId: string | null;

  @ManyToOne(() => Individual, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'individualId' })
  individual?: Individual | null;

  /** Fee in PKR = productVariant × 1,000, snapshotted at submission. */
  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'int' })
  productVariant: number;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.MANUAL_BANK_TRANSFER })
  method: PaymentMethod;

  @Index()
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'varchar', nullable: true })
  proofImageUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  proofImagePublicId: string | null;

  /** Optional payer-supplied reference — sender name, bank txn id, etc. */
  @Column({ type: 'varchar', nullable: true })
  reference: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedByUserId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  // Reserved for a future online payment gateway.
  @Column({ type: 'varchar', nullable: true })
  gatewayProvider: string | null;

  @Column({ type: 'varchar', nullable: true })
  gatewayRef: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
