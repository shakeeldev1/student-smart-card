import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Links each AREA_MANAGER user to the single administrative area they oversee.
 * `level` is a plain varchar ('province' | 'region' | 'district' | 'tehsil');
 * the geo columns mirror those already on institutions/students so scoping is
 * a straight equality match. `setupToken` powers the emailed password-setup
 * link (same pattern as students).
 */
export class CreateAreaManagersTable1788350000000 implements MigrationInterface {
  name = 'CreateAreaManagersTable1788350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "area_managers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "level" character varying NOT NULL,
        "province" character varying NOT NULL,
        "region" character varying,
        "district" character varying,
        "tehsil" character varying,
        "setupToken" character varying,
        "setupTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_area_managers_userId" ON "area_managers" ("userId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "area_managers"
       ADD CONSTRAINT "FK_area_managers_userId"
       FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "area_managers" DROP CONSTRAINT "FK_area_managers_userId"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_area_managers_userId"`);
    await queryRunner.query(`DROP TABLE "area_managers"`);
  }
}
