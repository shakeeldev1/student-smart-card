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
import { Employee } from './employee.entity';
import { CardStatus } from '../../cards/enums/card-status.enum';

@Entity('employee_cards')
export class EmployeeCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  employeeId: string;

  @OneToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  cardNumber: string;

  @Column({
    type: 'enum',
    enum: CardStatus,
    enumName: 'employee_cards_status_enum',
    default: CardStatus.PENDING_VERIFICATION,
  })
  status: CardStatus;

  @Column({ type: 'timestamptz' })
  issuedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  verificationCode: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verificationCodeExpiresAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'int', default: 0 })
  verificationAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  verificationCodeSentAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
