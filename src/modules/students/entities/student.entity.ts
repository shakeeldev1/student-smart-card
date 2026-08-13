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
import { Institution } from '../../institutions/entities/institution.entity';
import { Card } from '../../cards/entities/card.entity';
import { Gender } from '../enums/gender.enum';
import { GuardianRelationship } from '../enums/guardian-relationship.enum';
import { ApplicationStatus } from '../enums/application-status.enum';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  fullName: string;

  @Column({ type: 'varchar' })
  fatherName: string;

  @Column({ type: 'varchar', nullable: true })
  motherName: string | null;

  @Column({ type: 'date' })
  dateOfBirth: string;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 13 })
  bFormNumber: string;

  @Column({ type: 'varchar' })
  className: string;

  @Column({ type: 'varchar', nullable: true })
  contactNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar' })
  guardianName: string;

  @Column({ type: 'varchar', length: 13 })
  guardianCnic: string;

  @Column({ type: 'date', nullable: true })
  guardianDateOfBirth: string | null;

  @Column({ type: 'enum', enum: GuardianRelationship })
  guardianRelationship: GuardianRelationship;

  @Column({ type: 'varchar', nullable: true })
  guardianMobile: string | null;

  @Column({ type: 'varchar', nullable: true })
  guardianEmail: string | null;

  @Column({ type: 'varchar', nullable: true })
  guardianAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  guardianCity: string | null;

  @Column({ type: 'varchar', nullable: true })
  institutionNameFreeText: string | null;

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
  institutionId: string | null;

  @ManyToOne(() => Institution, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'institutionId' })
  institution: Institution | null;

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

  @OneToOne(() => Card, (card) => card.student)
  card?: Card;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
