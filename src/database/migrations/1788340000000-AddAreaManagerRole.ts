import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the 'area_manager' value to the users role enum. Area managers are
 * admin-provisioned geographic oversight accounts scoped to a single
 * province / region / district / tehsil.
 */
export class AddAreaManagerRole1788340000000 implements MigrationInterface {
  name = 'AddAreaManagerRole1788340000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'area_manager';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM pg_enum
       WHERE enumlabel = 'area_manager'
         AND enumtypid = (
           SELECT oid FROM pg_type WHERE typname = 'users_role_enum'
         )`,
    );
  }
}
