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
import { User } from '../../users/entities/user.entity';
import { Gender } from '../../students/enums/gender.enum';
import { ApplicationStatus } from '../../students/enums/application-status.enum';
import { NomineeRelationship } from '../enums/nominee-relationship.enum';
import { IndividualCard } from './individual-card.entity';

@Entity('individuals')
export class Individual {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar' })
  fullName: string;

  @Column({ type: 'varchar', nullable: true })
  photoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  photoPublicId: string | null;

  @Column({ type: 'varchar', nullable: true })
  fatherName: string | null;

  @Column({ type: 'date' })
  dateOfBirth: string;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 13 })
  cnicNumber: string;

  @Column({ type: 'varchar', nullable: true })
  contactNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  @Column({ type: 'varchar' })
  nomineeName: string;

  @Column({ type: 'enum', enum: NomineeRelationship })
  nomineeRelationship: NomineeRelationship;

  @Column({ type: 'varchar', length: 13 })
  nomineeCnic: string;

  @Column({ type: 'varchar' })
  nomineeMobile: string;

  @Column({ type: 'varchar', nullable: true })
  nomineeEmail: string | null;

  @Column({ type: 'varchar', nullable: true })
  nomineeAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  nomineeCity: string | null;

  @Column({ type: 'boolean', default: true })
  consentEnrollment: boolean;

  @Column({ type: 'boolean', default: true })
  consentIdentityVerification: boolean;

  @Column({ type: 'boolean', default: true })
  consentTermsAccepted: boolean;

  @Column({ type: 'boolean', default: true })
  consentDeclarationAccepted: boolean;

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

  @OneToOne(() => IndividualCard, (card) => card.individual)
  card?: IndividualCard;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
