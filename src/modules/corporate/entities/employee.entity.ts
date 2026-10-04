import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Gender } from '../../students/enums/gender.enum';
import { ApplicationStatus } from '../../students/enums/application-status.enum';
import { Company } from './company.entity';
import { EmployeeCard } from './employee-card.entity';

/**
 * An employee enrolled by a company. Mirrors Student (same lifecycle, payment,
 * EFU approval and card) with employment-specific fields and a nominee.
 */
@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  fullName: string;

  @Column({ type: 'varchar', nullable: true })
  photoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  photoPublicId: string | null;

  /** Father's or husband's name. */
  @Column({ type: 'varchar' })
  fatherOrHusbandName: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 13 })
  cnicNumber: string;

  @Column({ type: 'date' })
  dateOfBirth: string;

  @Column({ type: 'enum', enum: Gender, enumName: 'employees_gender_enum' })
  gender: Gender;

  /** The company's own employee ID / staff number. */
  @Column({ type: 'varchar', nullable: true })
  employeeCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  department: string | null;

  @Column({ type: 'varchar', nullable: true })
  designation: string | null;

  @Column({ type: 'date', nullable: true })
  joiningDate: string | null;

  @Column({ type: 'varchar', nullable: true })
  branchLocation: string | null;

  @Column({ type: 'varchar', nullable: true })
  province: string | null;

  @Column({ type: 'varchar', nullable: true })
  region: string | null;

  @Column({ type: 'varchar', nullable: true })
  district: string | null;

  @Column({ type: 'varchar', nullable: true })
  tehsil: string | null;

  @Column({ type: 'varchar', nullable: true })
  contactNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  /** EFU takaful product variant (1–10). Coverage = variant × 100,000. */
  @Column({ type: 'int', nullable: true })
  productVariant: number | null;

  // ---- Nominee / takaful ----
  @Column({ type: 'varchar' })
  nomineeName: string;

  @Column({ type: 'varchar' })
  nomineeRelationship: string;

  @Column({ type: 'varchar', length: 13, nullable: true })
  nomineeCnic: string | null;

  @Column({ type: 'date', nullable: true })
  nomineeDateOfBirth: string | null;

  @Column({ type: 'varchar', nullable: true })
  nomineeMobile: string | null;

  @Column({ type: 'boolean', default: true })
  consentEnrollment: boolean;

  @Column({ type: 'boolean', default: true })
  consentIdentityVerification: boolean;

  @Column({ type: 'boolean', default: true })
  consentTermsAccepted: boolean;

  @Column({ type: 'boolean', default: true })
  consentDeclarationAccepted: boolean;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company | null;

  @Index()
  @Column({ type: 'uuid' })
  registeredByUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'registeredByUserId' })
  registeredByUser: User;

  @Index()
  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    enumName: 'employees_status_enum',
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedByUserId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  reviewNote: string | null;

  @Column({ type: 'boolean', default: false })
  certificateIssued: boolean;

  @Index({ unique: true })
  @Column({ type: 'varchar', nullable: true })
  certificateNumber: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  certificateIssuedAt: Date | null;

  @OneToOne(() => EmployeeCard, (card) => card.employee)
  card?: EmployeeCard;

  /** Public, no-login payment/tracking link token. */
  @Index({ unique: true })
  @Column({ type: 'varchar', nullable: true })
  publicToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  setupToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  setupTokenExpiresAt: Date | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @OneToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
