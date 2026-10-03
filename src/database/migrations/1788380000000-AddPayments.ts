import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Manual registration-payment flow: a `payments` row per application
 * (student OR individual), plus admin-managed `payment_settings` (bank details
 * + QR). Amount = productVariant × 1,000. Designed so a future online gateway
 * only adds a payment method/row without changing the lifecycle.
 */
export class AddPayments1788380000000 implements MigrationInterface {
  name = 'AddPayments1788380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."payments_method_enum" AS ENUM('manual_bank_transfer', 'gateway')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_status_enum" AS ENUM('pending', 'confirmed', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentId" uuid,
        "individualId" uuid,
        "amount" integer NOT NULL,
        "productVariant" integer NOT NULL,
        "method" "public"."payments_method_enum" NOT NULL DEFAULT 'manual_bank_transfer',
        "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending',
        "proofImageUrl" character varying,
        "proofImagePublicId" character varying,
        "reference" character varying,
        "reviewedByUserId" uuid,
        "reviewedAt" TIMESTAMP WITH TIME ZONE,
        "rejectionReason" text,
        "gatewayProvider" character varying,
        "gatewayRef" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_studentId" ON "payments" ("studentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_individualId" ON "payments" ("individualId")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_payments_status" ON "payments" ("status")`);
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_student" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_individual" FOREIGN KEY ("individualId") REFERENCES "individuals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "payment_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "bankName" character varying,
        "accountTitle" character varying,
        "accountNumber" character varying,
        "iban" character varying,
        "qrImageUrl" character varying,
        "qrImagePublicId" character varying,
        "instructions" text,
        "updatedByUserId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_settings" PRIMARY KEY ("id")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payment_settings"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_individual"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_student"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_individualId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_studentId"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payments_method_enum"`);
  }
}
