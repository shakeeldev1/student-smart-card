import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminRole1788210000000 implements MigrationInterface {
  name = 'AddAdminRole1788210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'admin';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM pg_enum
       WHERE enumlabel = 'admin'
         AND enumtypid = (
           SELECT oid FROM pg_type WHERE typname = 'users_role_enum'
         )`,
    );
  }
}
