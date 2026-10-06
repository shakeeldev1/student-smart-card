import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Store the decoded QR content so payers can be shown a freshly-rendered,
 * resolution-independent QR (scans instantly) instead of the uploaded raster.
 */
export class AddPaymentQrData1788440000000 implements MigrationInterface {
  name = 'AddPaymentQrData1788440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_settings" ADD COLUMN IF NOT EXISTS "qrData" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_settings" DROP COLUMN IF EXISTS "qrData"`,
    );
  }
}
