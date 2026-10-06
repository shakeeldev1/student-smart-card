import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar' })
  passwordHash: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true })
  profilePhotoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  profilePhotoPublicId: string | null;

  /**
   * One-time token for an admin-provisioned staff account to set its own
   * password (also doubles as an admin-triggered password reset). Entity-backed
   * roles (student/employee/area manager) keep their own setup tokens on their
   * respective rows; this is only for accounts that are *just* a user.
   */
  @Index({ unique: true, where: '"setupToken" IS NOT NULL' })
  @Column({ type: 'varchar', nullable: true })
  setupToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  setupTokenExpiresAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
