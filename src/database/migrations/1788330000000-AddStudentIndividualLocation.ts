import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds administrative-location fields (Province -> Region/Division ->
 * District -> Tehsil) to students and individuals, matching the columns
 * already on institutions. Captured at registration and later used to power
 * per-province / region / district / tehsil dashboards that show each area's
 * own records. Nullable so pre-existing rows remain valid.
 */
export class AddStudentIndividualLocation1788330000000 implements MigrationInterface {
  name = 'AddStudentIndividualLocation1788330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['students', 'individuals']) {
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "province" character varying`);
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "region" character varying`);
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "district" character varying`);
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "tehsil" character varying`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['students', 'individuals']) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "tehsil"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "district"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "region"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "province"`);
    }
  }
}
