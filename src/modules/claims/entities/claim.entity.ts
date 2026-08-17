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
import { ClaimantRelationship } from '../enums/claimant-relationship.enum';

@Entity('claims')
export class Claim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', nullable: true })
  claimNumber: string | null;

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

  @Column({ type: 'varchar', nullable: true })
  placeOfIncident: string | null;

  @Column({ type: 'enum', enum: ClaimType })
  claimType: ClaimType;

  @Column({ type: 'enum', enum: ClaimStatus, default: ClaimStatus.PENDING })
  status: ClaimStatus;

  @Column({ type: 'varchar', nullable: true })
  claimantName: string | null;

  @Column({
    type: 'enum',
    enum: ClaimantRelationship,
    nullable: true,
  })
  claimantRelationship: ClaimantRelationship | null;

  @Column({ type: 'varchar', nullable: true })
  claimantCnic: string | null;

  @Column({ type: 'varchar', nullable: true })
  claimantContactNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  claimantSignature: string | null;

  @Column({ type: 'boolean', default: false })
  documentDeathCertificate: boolean;

  @Column({ type: 'boolean', default: false })
  documentMedicalDisability: boolean;

  @Column({ type: 'boolean', default: false })
  documentStudentCnicOrBForm: boolean;

  @Column({ type: 'boolean', default: false })
  documentClaimantCnic: boolean;

  @Column({ type: 'boolean', default: false })
  documentStudentCard: boolean;

  @Column({ type: 'boolean', default: false })
  documentPoliceReport: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
