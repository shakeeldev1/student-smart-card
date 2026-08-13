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
import { InstitutionType } from '../enums/institution-type.enum';
import { InstitutionApprovalStatus } from '../enums/institution-approval-status.enum';

@Entity('institutions')
export class Institution {
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

  @Column({ type: 'enum', enum: InstitutionType })
  type: InstitutionType;

  @Column({ type: 'varchar' })
  address: string;

  @Column({ type: 'varchar' })
  city: string;

  @Column({ type: 'varchar' })
  contactNumber: string;

  @Column({ type: 'varchar' })
  officialEmail: string;

  @Column({ type: 'varchar' })
  principalName: string;

  @Column({ type: 'varchar' })
  authorizedPersonName: string;

  @Column({ type: 'varchar' })
  authorizedPersonDesignation: string;

  @Column({ type: 'varchar', length: 13 })
  authorizedPersonCnic: string;

  @Column({ type: 'varchar' })
  authorizedPersonMobile: string;

  @Column({ type: 'int' })
  numberOfStudents: number;

  @Column({
    type: 'enum',
    enum: InstitutionApprovalStatus,
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
