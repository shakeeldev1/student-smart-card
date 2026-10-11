import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extend the referral/commission programme to schools and corporates:
 *  - a reference code per institution (SSC-SCH-...) and per company (SSC-COR-...)
 *  - separate per-head commission rates for school students and corporate
 *    employees alongside the existing per-individual (franchise) rate.
 */
export class AddPartnerReferralCodes1788500000000
  implements MigrationInterface
{
  name = 'AddPartnerReferralCodes1788500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "institutions" ADD COLUMN IF NOT EXISTS "referralCode" character varying`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_institutions_referralCode" ON "institutions" ("referralCode") WHERE "referralCode" IS NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "referralCode" character varying`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_companies_referralCode" ON "companies" ("referralCode") WHERE "referralCode" IS NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "franchise_settings" ADD COLUMN IF NOT EXISTS "commissionPerStudent" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "franchise_settings" ADD COLUMN IF NOT EXISTS "commissionPerEmployee" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "franchise_settings" DROP COLUMN IF EXISTS "commissionPerEmployee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "franchise_settings" DROP COLUMN IF EXISTS "commissionPerStudent"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_companies_referralCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN IF EXISTS "referralCode"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_institutions_referralCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" DROP COLUMN IF EXISTS "referralCode"`,
    );
  }
}
