import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClaimFormDetails1788230000000 implements MigrationInterface {
  name = 'AddClaimFormDetails1788230000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."claims_claimantrelationship_enum" AS ENUM (
        'self',
        'father',
        'mother',
        'guardian',
        'other'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "claims"
      ADD COLUMN "claimNumber" character varying,
      ADD COLUMN "placeOfIncident" character varying,
      ADD COLUMN "claimantName" character varying,
      ADD COLUMN "claimantRelationship" "public"."claims_claimantrelationship_enum",
      ADD COLUMN "claimantCnic" character varying,
      ADD COLUMN "claimantContactNumber" character varying,
      ADD COLUMN "claimantSignature" character varying,
      ADD COLUMN "documentDeathCertificate" boolean NOT NULL DEFAULT false,
      ADD COLUMN "documentMedicalDisability" boolean NOT NULL DEFAULT false,
      ADD COLUMN "documentStudentCnicOrBForm" boolean NOT NULL DEFAULT false,
      ADD COLUMN "documentClaimantCnic" boolean NOT NULL DEFAULT false,
      ADD COLUMN "documentStudentCard" boolean NOT NULL DEFAULT false,
      ADD COLUMN "documentPoliceReport" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_claims_claimNumber" ON "claims" ("claimNumber")
      WHERE "claimNumber" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_claims_claimNumber"`);

    await queryRunner.query(`
      ALTER TABLE "claims"
      DROP COLUMN "claimNumber",
      DROP COLUMN "placeOfIncident",
      DROP COLUMN "claimantName",
      DROP COLUMN "claimantRelationship",
      DROP COLUMN "claimantCnic",
      DROP COLUMN "claimantContactNumber",
      DROP COLUMN "claimantSignature",
      DROP COLUMN "documentDeathCertificate",
      DROP COLUMN "documentMedicalDisability",
      DROP COLUMN "documentStudentCnicOrBForm",
      DROP COLUMN "documentClaimantCnic",
      DROP COLUMN "documentStudentCard",
      DROP COLUMN "documentPoliceReport"
    `);

    await queryRunner.query(
      `DROP TYPE "public"."claims_claimantrelationship_enum"`,
    );
  }
}
