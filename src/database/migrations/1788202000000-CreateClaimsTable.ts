import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClaimsTable1788202000000 implements MigrationInterface {
  name = 'CreateClaimsTable1788202000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."claims_claimtype_enum" AS ENUM (
        'natural_death',
        'accidental_death',
        'accidental_disability'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."claims_claimstatus_enum" AS ENUM (
        'pending',
        'approved',
        'rejected',
        'under_review'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "claims" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "cardNumber" character varying NOT NULL,
        "dateOfDeath" date,
        "dateOfAccidentalDisability" date,
        "claimType" "public"."claims_claimtype_enum" NOT NULL,
        "status" "public"."claims_claimstatus_enum" NOT NULL DEFAULT 'pending',
        "notes" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_claims_studentId" ON "claims" ("studentId")
    `);

    await queryRunner.query(`
      ALTER TABLE "claims" 
      ADD CONSTRAINT "FK_claims_studentId" 
      FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "claims" DROP CONSTRAINT "FK_claims_studentId"`,
    );

    await queryRunner.query(`DROP INDEX "IDX_claims_studentId"`);

    await queryRunner.query(`DROP TABLE "claims"`);

    await queryRunner.query(`DROP TYPE "public"."claims_claimstatus_enum"`);

    await queryRunner.query(`DROP TYPE "public"."claims_claimtype_enum"`);
  }
}
