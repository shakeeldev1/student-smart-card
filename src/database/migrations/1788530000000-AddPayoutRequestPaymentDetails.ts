import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayoutRequestPaymentDetails1788530000000
  implements MigrationInterface
{
  name = 'AddPayoutRequestPaymentDetails1788530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "commission_payout_requests"
      ADD COLUMN IF NOT EXISTS "bankName" character varying NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      ALTER TABLE "commission_payout_requests"
      ADD COLUMN IF NOT EXISTS "accountNumber" character varying NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      ALTER TABLE "commission_payout_requests"
      ADD COLUMN IF NOT EXISTS "accountHolderName" character varying NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      ALTER TABLE "commission_payout_requests"
      ADD COLUMN IF NOT EXISTS "paymentProofUrl" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "commission_payout_requests"
      ADD COLUMN IF NOT EXISTS "paymentProofPublicId" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "commission_payout_requests"
      DROP COLUMN IF EXISTS "paymentProofPublicId"
    `);
    await queryRunner.query(`
      ALTER TABLE "commission_payout_requests"
      DROP COLUMN IF EXISTS "paymentProofUrl"
    `);
    await queryRunner.query(`
      ALTER TABLE "commission_payout_requests"
      DROP COLUMN IF EXISTS "accountHolderName"
    `);
    await queryRunner.query(`
      ALTER TABLE "commission_payout_requests"
      DROP COLUMN IF EXISTS "accountNumber"
    `);
    await queryRunner.query(`
      ALTER TABLE "commission_payout_requests"
      DROP COLUMN IF EXISTS "bankName"
    `);
  }
}
