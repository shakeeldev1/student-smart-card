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
import { Student } from '../../students/entities/student.entity';
import { CardStatus } from '../enums/card-status.enum';

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  studentId: string;

  @OneToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  cardNumber: string;

  @Column({ type: 'enum', enum: CardStatus, default: CardStatus.PENDING_VERIFICATION })
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
