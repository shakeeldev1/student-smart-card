import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Individual } from './individual.entity';
import { CardStatus } from '../../cards/enums/card-status.enum';

@Entity('individual_cards')
export class IndividualCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  individualId: string;

  @OneToOne(() => Individual, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'individualId' })
  individual: Individual;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  cardNumber: string;

  @Column({
    type: 'enum',
    enum: CardStatus,
    default: CardStatus.PENDING_VERIFICATION,
  })
  status: CardStatus;

  @Column({ type: 'timestamptz' })
  issuedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  verificationCode: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verificationCodeExpiresAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
