import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApplicantPhotos1788290000000 implements MigrationInterface {
  name = 'AddApplicantPhotos1788290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "students" ADD COLUMN "photoUrl" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD COLUMN "photoPublicId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "individuals" ADD COLUMN "photoUrl" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "individuals" ADD COLUMN "photoPublicId" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "individuals" DROP COLUMN "photoPublicId"`,
    );
    await queryRunner.query(`ALTER TABLE "individuals" DROP COLUMN "photoUrl"`);
    await queryRunner.query(
      `ALTER TABLE "students" DROP COLUMN "photoPublicId"`,
    );
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "photoUrl"`);
  }
}
