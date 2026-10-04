import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the 'corporate' (company account) and 'employee' values to the users
 * role enum, for the corporate flow (companies enroll employees).
 */
export class AddCorporateRoles1788400000000 implements MigrationInterface {
  name = 'AddCorporateRoles1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'corporate';`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'employee';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM pg_enum
       WHERE enumlabel IN ('corporate', 'employee')
         AND enumtypid = (
           SELECT oid FROM pg_type WHERE typname = 'users_role_enum'
         )`,
    );
  }
}
