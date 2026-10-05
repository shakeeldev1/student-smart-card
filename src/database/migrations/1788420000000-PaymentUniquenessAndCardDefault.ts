import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hardening for production:
 * 1. Enforce at most ONE payment row per applicant (student / individual /
 *    employee) via partial unique indexes. The service upsert logic already
 *    assumes this; the constraint stops a concurrent double-submit from
 *    creating two rows (which would double-count an applicant in the EFU
 *    queue's innerJoin on confirmed payments).
 * 2. Align the `cards.status` column default with the entity
 *    (PENDING_VERIFICATION); it was created defaulting to 'active'.
 */
export class PaymentUniquenessAndCardDefault1788420000000 implements MigrationInterface {
  name = 'PaymentUniquenessAndCardDefault1788420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payments_studentId" ON "payments" ("studentId") WHERE "studentId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payments_individualId" ON "payments" ("individualId") WHERE "individualId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payments_employeeId" ON "payments" ("employeeId") WHERE "employeeId" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "cards" ALTER COLUMN "status" SET DEFAULT 'pending_verification'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cards" ALTER COLUMN "status" SET DEFAULT 'active'`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_payments_employeeId"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_payments_individualId"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_payments_studentId"`);
  }
}
