import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInstitutionLogo1788300000000 implements MigrationInterface {
  name = 'AddInstitutionLogo1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "institutions" ADD COLUMN "logoUrl" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" ADD COLUMN "logoPublicId" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "institutions" DROP COLUMN "logoPublicId"`,
    );
    await queryRunner.query(`ALTER TABLE "institutions" DROP COLUMN "logoUrl"`);
  }
}
