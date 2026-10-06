import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Generic one-time password-setup token on the users table, for
 * admin-provisioned staff accounts (admin/operator/efu) that are just a login
 * with no backing domain entity. Partial unique index so many NULLs coexist.
 */
export class AddUserSetupToken1788450000000 implements MigrationInterface {
  name = 'AddUserSetupToken1788450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "setupToken" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "setupTokenExpiresAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_setupToken" ON "users" ("setupToken") WHERE "setupToken" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_setupToken"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "setupTokenExpiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "setupToken"`,
    );
  }
}
