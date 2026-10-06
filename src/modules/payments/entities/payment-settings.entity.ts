import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Admin-managed manual-payment instructions shown to payers (schools and
 * individuals): bank details plus an optional QR/barcode image. A single row is
 * maintained (get-or-create).
 */
@Entity('payment_settings')
export class PaymentSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  bankName: string | null;

  @Column({ type: 'varchar', nullable: true })
  accountTitle: string | null;

  @Column({ type: 'varchar', nullable: true })
  accountNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  iban: string | null;

  @Column({ type: 'varchar', nullable: true })
  qrImageUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  qrImagePublicId: string | null;

  /**
   * The decoded content of the QR (the payment string it encodes). When set,
   * payers see a freshly-rendered crisp vector QR instead of the raster image,
   * so it scans instantly at any size.
   */
  @Column({ type: 'text', nullable: true })
  qrData: string | null;

  @Column({ type: 'text', nullable: true })
  instructions: string | null;

  @Column({ type: 'uuid', nullable: true })
  updatedByUserId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
