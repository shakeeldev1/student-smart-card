import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * - students.rollNumber: the school's own roll number, printed on the card
 *   and shared with the e-commerce platform. Unique per institution.
 * - cards/individual_cards.expiresAt: card validity end, so partner systems
 *   read expiry from the issuer instead of inventing one. Existing cards are
 *   backfilled to issuedAt + 12 months (the default CARD_VALIDITY_MONTHS).
 * - verificationAttempts / verificationCodeSentAt: brute-force protection
 *   and resend cooldown on the public card verification endpoints.
 */
export class AddRollNumberCardExpiryAndAttempts1788310000000
  implements MigrationInterface
{
  name = 'AddRollNumberCardExpiryAndAttempts1788310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "students" ADD COLUMN "rollNumber" character varying(50)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_students_institution_roll_number" ON "students" ("institutionId", "rollNumber") WHERE "rollNumber" IS NOT NULL AND "institutionId" IS NOT NULL`,
    );

    for (const table of ['cards', 'individual_cards']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "expiresAt" TIMESTAMP WITH TIME ZONE`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "verificationAttempts" integer NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "verificationCodeSentAt" TIMESTAMP WITH TIME ZONE`,
      );
      await queryRunner.query(
        `UPDATE "${table}" SET "expiresAt" = "issuedAt" + INTERVAL '12 months' WHERE "expiresAt" IS NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['individual_cards', 'cards']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN "verificationCodeSentAt"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN "verificationAttempts"`,
      );
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "expiresAt"`);
    }
    await queryRunner.query(
      `DROP INDEX "public"."UQ_students_institution_roll_number"`,
    );
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "rollNumber"`);
  }
}
