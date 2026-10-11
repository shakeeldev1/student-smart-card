import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Per-variant commission override. When a row exists for (channel, variant) it
 * takes precedence over the flat per-channel default in franchise_settings.
 * Absence of a row means "use the flat default for that channel".
 */
@Entity('commission_rates')
@Index(['channel', 'productVariant'], { unique: true })
export class CommissionRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** CommissionChannel value. */
  @Column({ type: 'varchar' })
  channel: string;

  @Column({ type: 'int' })
  productVariant: number;

  /** Commission (PKR) paid per confirmed registration of this variant. */
  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'uuid', nullable: true })
  updatedByUserId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
