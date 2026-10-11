import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Single-row settings for the referral / commission programme. Admin edits the
 * flat commission paid per confirmed registration, separately for each channel:
 * franchise individuals, school students, and corporate employees.
 */
@Entity('franchise_settings')
export class FranchiseSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Flat commission in PKR per confirmed individual registration (franchise). */
  @Column({ type: 'int', default: 0 })
  commissionPerIndividual: number;

  /** Flat commission in PKR per confirmed school-student registration. */
  @Column({ type: 'int', default: 0 })
  commissionPerStudent: number;

  /** Flat commission in PKR per confirmed corporate-employee registration. */
  @Column({ type: 'int', default: 0 })
  commissionPerEmployee: number;

  @Column({ type: 'uuid', nullable: true })
  updatedByUserId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
