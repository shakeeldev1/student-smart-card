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
import { InternshipApplicationStatus } from '../enums/internship-application-status.enum';
import { InternshipArea } from '../enums/internship-area.enum';
import { InternshipDuration } from '../enums/internship-duration.enum';
import { InternshipGender } from '../enums/internship-gender.enum';
import { InternshipMode } from '../enums/internship-mode.enum';
import { InternshipType } from '../enums/internship-type.enum';

@Entity('internship_applications')
export class InternshipApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  fullName: string;

  @Column({ type: 'varchar' })
  fatherGuardianName: string;

  @Column({ type: 'date' })
  dateOfBirth: string;

  @Column({ type: 'enum', enum: InternshipGender })
  gender: InternshipGender;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  bFormOrCnicNo: string;

  @Column({ type: 'varchar', length: 20 })
  mobileNumber: string;

  @Column({ type: 'varchar' })
  emailAddress: string;

  @Column({ type: 'varchar' })
  currentAddress: string;

  @Column({ type: 'varchar', length: 120 })
  cityDistrict: string;

  @Column({ type: 'varchar' })
  institutionName: string;

  @Column({ type: 'varchar', length: 80 })
  studentRegistrationNo: string;

  @Column({ type: 'varchar', length: 120 })
  currentClassDegree: string;

  @Column({ type: 'varchar', length: 120 })
  programMajorSubject: string;

  @Column({ type: 'varchar', length: 80 })
  currentSemesterYear: string;

  @Column({ type: 'varchar', length: 4 })
  expectedGraduationYear: string;

  @Column({ type: 'varchar', length: 30 })
  marksCgpa: string;

  @Column({ type: 'enum', enum: InternshipArea })
  internshipAreaField: InternshipArea;

  @Column({ type: 'varchar', length: 120 })
  preferredInternshipLocation: string;

  @Column({ type: 'enum', enum: InternshipDuration })
  preferredDuration: InternshipDuration;

  @Column({ type: 'date' })
  preferredStartDate: string;

  @Column({
    type: 'enum',
    enum: InternshipType,
    default: InternshipType.UNPAID_ONLY,
  })
  internshipType: InternshipType;

  @Column({ type: 'enum', enum: InternshipMode })
  modeOfInternship: InternshipMode;

  @Column({ type: 'text' })
  technicalSkills: string;

  @Column({ type: 'text' })
  softSkills: string;

  @Column({ type: 'text' })
  previousInternshipExperience: string;

  @Column({ type: 'text' })
  projectsAchievements: string;

  @Column({ type: 'text' })
  certifications: string;

  @Column({ type: 'varchar' })
  recentPhotographPath: string;

  @Column({ type: 'varchar' })
  studentCardInstitutionIdPath: string;

  @Column({ type: 'varchar' })
  academicCertificateTranscriptPath: string;

  @Column({ type: 'varchar' })
  recommendationLetterNocPath: string;

  @Column({ type: 'varchar', length: 150 })
  emergencyContactName: string;

  @Column({ type: 'varchar', length: 80 })
  emergencyContactRelationship: string;

  @Column({ type: 'varchar', length: 20 })
  emergencyContactMobileNumber: string;

  @Column({ type: 'boolean', default: false })
  declarationAccepted: boolean;

  @Column({ type: 'boolean', default: false })
  termsAccepted: boolean;

  @Index()
  @Column({ type: 'uuid' })
  registeredByUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'registeredByUserId' })
  registeredByUser: User;

  @Index()
  @Column({
    type: 'enum',
    enum: InternshipApplicationStatus,
    default: InternshipApplicationStatus.PENDING,
  })
  status: InternshipApplicationStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedByUserId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  reviewNote: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
