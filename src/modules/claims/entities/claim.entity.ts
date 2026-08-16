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
import { ClaimType } from '../enums/claim-type.enum';
import { ClaimStatus } from '../enums/claim-status.enum';

@Entity('claims')
export class Claim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ type: 'varchar' })
  cardNumber: string;

  @Column({ type: 'date', nullable: true })
  dateOfDeath: Date | null;

  @Column({ type: 'date', nullable: true })
  dateOfAccidentalDisability: Date | null;

  @Column({ type: 'enum', enum: ClaimType })
  claimType: ClaimType;

  @Column({ type: 'enum', enum: ClaimStatus, default: ClaimStatus.PENDING })
  status: ClaimStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
