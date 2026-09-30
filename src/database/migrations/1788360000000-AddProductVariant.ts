import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the EFU takaful product variant (1–10) to students and individuals.
 * Coverage is derived from the variant (variant × 100,000 PKR) at display time,
 * so only the variant is stored. Nullable so pre-existing rows stay valid.
 */
export class AddProductVariant1788360000000 implements MigrationInterface {
  name = 'AddProductVariant1788360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['students', 'individuals']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "productVariant" integer`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['students', 'individuals']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN "productVariant"`,
      );
    }
  }
}
