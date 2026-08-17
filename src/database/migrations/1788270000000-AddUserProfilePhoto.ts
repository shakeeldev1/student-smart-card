import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProfilePhoto1788270000000 implements MigrationInterface {
  name = 'AddUserProfilePhoto1788270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "profilePhotoUrl" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "profilePhotoPublicId" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "profilePhotoPublicId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "profilePhotoUrl"`,
    );
  }
}
