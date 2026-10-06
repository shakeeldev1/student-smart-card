import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReviewStatus } from '../enums/review-status.enum';

/**
 * A public visitor review/testimonial. Submitted by anyone, shown on the
 * website only after an admin approves it.
 */
@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  /** Private — for admin reference only, never returned publicly. */
  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  /** Reviewer type shown as the role label, e.g. "Parent", "Student". */
  @Column({ type: 'varchar', nullable: true })
  role: string | null;

  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  @Column({ type: 'int', default: 5 })
  rating: number;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', nullable: true })
  photoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  photoPublicId: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: ReviewStatus,
    enumName: 'reviews_status_enum',
    default: ReviewStatus.PENDING,
  })
  status: ReviewStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
