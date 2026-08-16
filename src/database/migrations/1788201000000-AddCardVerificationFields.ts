import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCardVerificationFields1788201000000
  implements MigrationInterface
{
  name = 'AddCardVerificationFields1788201000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."cards_status_enum" ADD VALUE IF NOT EXISTS 'pending_verification';`,
    );
    await queryRunner.query(
      `ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "verificationCode" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "verificationCodeExpiresAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cards" DROP COLUMN IF EXISTS "verificationCodeExpiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cards" DROP COLUMN IF EXISTS "verificationCode"`,
    );

    await queryRunner.query(
      `DELETE FROM pg_enum
       WHERE enumlabel = 'pending_verification'
         AND enumtypid = (
           SELECT oid FROM pg_type WHERE typname = 'cards_status_enum'
         )`,
    );
  }
}
