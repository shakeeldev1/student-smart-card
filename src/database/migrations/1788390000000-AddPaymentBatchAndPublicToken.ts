import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Supports two UX additions on the payment flow:
 *  - `payments.batchId` groups several students paid together in one combined
 *    transfer (one proof, confirmed/rejected as a batch).
 *  - `students.publicToken` backs a public, no-login payment/tracking link a
 *    school can share with a student or parent. Existing students are backfilled.
 */
export class AddPaymentBatchAndPublicToken1788390000000
  implements MigrationInterface
{
  name = 'AddPaymentBatchAndPublicToken1788390000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" ADD "batchId" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_batchId" ON "payments" ("batchId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "students" ADD "publicToken" character varying`,
    );
    // Backfill existing students with a unique token (hex of a random uuid).
    await queryRunner.query(
      `UPDATE "students" SET "publicToken" = replace(uuid_generate_v4()::text, '-', '') || replace(uuid_generate_v4()::text, '-', '') WHERE "publicToken" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_students_publicToken" ON "students" ("publicToken")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_students_publicToken"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "publicToken"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_batchId"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "batchId"`);
  }
}
