import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * A settlement recorded by an admin: money actually paid out to a partner
 * (franchise / school / corporate). "Outstanding" for a partner is their total
 * earned commission minus the sum of these payouts.
 */
@Entity('commission_payouts')
export class CommissionPayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** CommissionChannel value. */
  @Index()
  @Column({ type: 'varchar' })
  channel: string;

  /** area_manager / institution / company id, depending on channel. */
  @Index()
  @Column({ type: 'uuid' })
  partnerId: string;

  @Column({ type: 'int' })
  amount: number;

  /** Optional note — cheque no., bank reference, period covered, etc. */
  @Column({ type: 'varchar', nullable: true })
  reference: string | null;

  @Column({ type: 'uuid', nullable: true })
  paidByUserId: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  paidAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
