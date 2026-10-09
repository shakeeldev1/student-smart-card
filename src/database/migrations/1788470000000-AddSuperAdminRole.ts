import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the 'super_admin' superuser role to the users role enum. This account
 * can access all internal oversight dashboards (Admin, EFU, Operations).
 */
export class AddSuperAdminRole1788470000000 implements MigrationInterface {
  name = 'AddSuperAdminRole1788470000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'super_admin';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM pg_enum
       WHERE enumlabel = 'super_admin'
         AND enumtypid = (
           SELECT oid FROM pg_type WHERE typname = 'users_role_enum'
         )`,
    );
  }
}
