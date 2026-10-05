import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Registry of golden card-number suffixes that have been assigned to a
 * cardholder. The unique `suffix` enforces that a golden number is given to at
 * most one person system-wide. A suffix is "available" simply when it is golden
 * (see isGoldenSuffix) and has no row here.
 */
@Entity('golden_card_numbers')
export class GoldenCardNumber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 8 })
  suffix: string;

  /** The full 16-digit card number this suffix was applied to. */
  @Column({ type: 'varchar' })
  cardNumber: string;

  /** 'student' | 'individual' | 'employee' */
  @Column({ type: 'varchar', length: 16 })
  cardType: string;

  /** Snapshot of the holder's name at assignment time (for the admin list). */
  @Column({ type: 'varchar', nullable: true })
  holderName: string | null;

  @Column({ type: 'uuid', nullable: true })
  assignedByUserId: string | null;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  assignedAt: Date;
}
