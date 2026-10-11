import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Franchise programme: area managers double as franchises (meaningful code),
 * individuals can register under a franchise code, and a flat commission per
 * confirmed registration is configured in franchise_settings.
 */
export class AddFranchise1788490000000 implements MigrationInterface {
  name = 'AddFranchise1788490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "area_managers" ADD COLUMN IF NOT EXISTS "franchiseCode" character varying`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_area_managers_franchiseCode" ON "area_managers" ("franchiseCode") WHERE "franchiseCode" IS NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "individuals" ADD COLUMN IF NOT EXISTS "franchiseId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_individuals_franchiseId" ON "individuals" ("franchiseId")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "franchise_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "commissionPerIndividual" integer NOT NULL DEFAULT 0,
        "updatedByUserId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_franchise_settings" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "franchise_settings"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_individuals_franchiseId"`);
    await queryRunner.query(
      `ALTER TABLE "individuals" DROP COLUMN IF EXISTS "franchiseId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_area_managers_franchiseCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "area_managers" DROP COLUMN IF EXISTS "franchiseCode"`,
    );
  }
}
