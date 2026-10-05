import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Registry of assigned "golden" card-number suffixes (special VIP numbers an
 * admin hands out). A unique suffix enforces one-per-person system-wide.
 */
export class AddGoldenCardNumbers1788430000000 implements MigrationInterface {
  name = 'AddGoldenCardNumbers1788430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "golden_card_numbers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "suffix" character varying(8) NOT NULL,
        "cardNumber" character varying NOT NULL,
        "cardType" character varying(16) NOT NULL,
        "holderName" character varying,
        "assignedByUserId" uuid,
        "note" character varying,
        "assignedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_golden_card_numbers" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_golden_card_numbers_suffix" ON "golden_card_numbers" ("suffix")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_golden_card_numbers_suffix"`);
    await queryRunner.query(`DROP TABLE "golden_card_numbers"`);
  }
}
