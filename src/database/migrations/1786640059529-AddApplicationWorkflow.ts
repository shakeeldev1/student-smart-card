import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApplicationWorkflow1786640059529 implements MigrationInterface {
  name = 'AddApplicationWorkflow1786640059529';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "students" ADD "guardianDateOfBirth" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD "institutionNameFreeText" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD "consentEnrollment" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD "consentIdentityVerification" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD "consentTermsAccepted" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD "consentDeclarationAccepted" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."students_status_enum" AS ENUM('pending', 'approved', 'changes_requested', 'rejected')`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD "status" "public"."students_status_enum" NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD "reviewedByUserId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD "reviewedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "students" ADD "reviewNote" text`);
    await queryRunner.query(
      `ALTER TABLE "students" ADD "certificateIssued" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD "certificateNumber" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD "certificateIssuedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_89d97b30d7d2b126c22e4fb28d" ON "students"  ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_04a48b64c3229c2c24e57bdd02" ON "students"  ("certificateNumber") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_04a48b64c3229c2c24e57bdd02"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_89d97b30d7d2b126c22e4fb28d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP COLUMN "certificateIssuedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP COLUMN "certificateNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP COLUMN "certificateIssued"`,
    );
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "reviewNote"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "reviewedAt"`);
    await queryRunner.query(
      `ALTER TABLE "students" DROP COLUMN "reviewedByUserId"`,
    );
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."students_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "students" DROP COLUMN "consentDeclarationAccepted"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP COLUMN "consentTermsAccepted"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP COLUMN "consentIdentityVerification"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP COLUMN "consentEnrollment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP COLUMN "institutionNameFreeText"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP COLUMN "guardianDateOfBirth"`,
    );
  }
}
