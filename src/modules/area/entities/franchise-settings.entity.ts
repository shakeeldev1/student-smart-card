import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Single-row settings for the franchise programme. Admin edits the flat
 * commission paid to a franchise per confirmed individual registration.
 */
@Entity('franchise_settings')
export class FranchiseSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Flat commission in PKR per confirmed individual registration. */
  @Column({ type: 'int', default: 0 })
  commissionPerIndividual: number;

  @Column({ type: 'uuid', nullable: true })
  updatedByUserId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
