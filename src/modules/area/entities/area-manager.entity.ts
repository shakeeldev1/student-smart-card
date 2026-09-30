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
import { AreaLevel } from '../enums/area-level.enum';

/**
 * Links an AREA_MANAGER user to the single administrative area they oversee.
 * The manager only ever sees rows (institutions / students) whose geo columns
 * match every non-null column here, so a Bahawalpur region manager sees only
 * Bahawalpur and a Lahore manager only Lahore.
 */
@Entity('area_managers')
export class AreaManager {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar' })
  level: AreaLevel;

  @Column({ type: 'varchar' })
  province: string;

  @Column({ type: 'varchar', nullable: true })
  region: string | null;

  @Column({ type: 'varchar', nullable: true })
  district: string | null;

  @Column({ type: 'varchar', nullable: true })
  tehsil: string | null;

  /** One-time password-setup token emailed to the manager on creation. */
  @Column({ type: 'varchar', nullable: true })
  setupToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  setupTokenExpiresAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
