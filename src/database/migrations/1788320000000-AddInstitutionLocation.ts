import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the cascading administrative-location fields captured on the school
 * registration form: Province -> Region (Division) -> District -> Tehsil.
 * Nullable so existing institution rows (registered before this feature)
 * remain valid; new registrations always supply province/region/district.
 */
export class AddInstitutionLocation1788320000000 implements MigrationInterface {
  name = 'AddInstitutionLocation1788320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "institutions" ADD COLUMN "province" character varying`);
    await queryRunner.query(`ALTER TABLE "institutions" ADD COLUMN "region" character varying`);
    await queryRunner.query(`ALTER TABLE "institutions" ADD COLUMN "district" character varying`);
    await queryRunner.query(`ALTER TABLE "institutions" ADD COLUMN "tehsil" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "institutions" DROP COLUMN "tehsil"`);
    await queryRunner.query(`ALTER TABLE "institutions" DROP COLUMN "district"`);
    await queryRunner.query(`ALTER TABLE "institutions" DROP COLUMN "region"`);
    await queryRunner.query(`ALTER TABLE "institutions" DROP COLUMN "province"`);
  }
}
