import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEfuRole1788200000000 implements MigrationInterface {
  name = 'AddEfuRole1788200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'efu';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM pg_enum
       WHERE enumlabel = 'efu'
         AND enumtypid = (
           SELECT oid FROM pg_type WHERE typname = 'users_role_enum'
         )`,
    );
  }
}
