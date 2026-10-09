import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the 'cash' value to the payment method enum, for admin-confirmed
 * offline/cash payments (no uploaded proof).
 */
export class AddCashPaymentMethod1788480000000 implements MigrationInterface {
  name = 'AddCashPaymentMethod1788480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."payments_method_enum" ADD VALUE IF NOT EXISTS 'cash';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM pg_enum
       WHERE enumlabel = 'cash'
         AND enumtypid = (
           SELECT oid FROM pg_type WHERE typname = 'payments_method_enum'
         )`,
    );
  }
}
