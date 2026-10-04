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
import { User } from '../../users/entities/user.entity';
import { InstitutionApprovalStatus } from '../../institutions/enums/institution-approval-status.enum';

/**
 * A corporate account. Mirrors Institution (self-registers, operator-approved)
 * but holds company-flavoured fields. Employees are enrolled under it.
 */
@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  ownerUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerUserId' })
  ownerUser: User;

  @Column({ type: 'varchar' })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  registrationNumber: string;

  @Column({ type: 'varchar' })
  address: string;

  @Column({ type: 'varchar' })
  city: string;

  @Column({ type: 'varchar', nullable: true })
  province: string | null;

  @Column({ type: 'varchar', nullable: true })
  region: string | null;

  @Column({ type: 'varchar', nullable: true })
  district: string | null;

  @Column({ type: 'varchar', nullable: true })
  tehsil: string | null;

  @Column({ type: 'varchar' })
  contactNumber: string;

  @Column({ type: 'varchar' })
  officialEmail: string;

  /** HR / authorized person who manages the account. */
  @Column({ type: 'varchar' })
  hrPersonName: string;

  @Column({ type: 'varchar' })
  authorizedPersonDesignation: string;

  @Column({ type: 'varchar', length: 13 })
  authorizedPersonCnic: string;

  @Column({ type: 'varchar' })
  authorizedPersonMobile: string;

  @Column({ type: 'int' })
  numberOfEmployees: number;

  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  logoPublicId: string | null;

  @Column({
    type: 'enum',
    enum: InstitutionApprovalStatus,
    enumName: 'companies_approvalstatus_enum',
    default: InstitutionApprovalStatus.PENDING_REVIEW,
  })
  approvalStatus: InstitutionApprovalStatus;

  @Column({ type: 'uuid', nullable: true })
  approvedByUserId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
