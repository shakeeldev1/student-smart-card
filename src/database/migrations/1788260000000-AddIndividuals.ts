import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndividuals1788260000000 implements MigrationInterface {
  name = 'AddIndividuals1788260000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."individuals_nomineerelationship_enum" AS ENUM (
        'spouse',
        'parent',
        'sibling',
        'child',
        'other'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "individuals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "fullName" character varying NOT NULL,
        "fatherName" character varying,
        "dateOfBirth" date NOT NULL,
        "gender" "public"."students_gender_enum" NOT NULL,
        "cnicNumber" character varying(13) NOT NULL,
        "contactNumber" character varying,
        "email" character varying,
        "address" character varying,
        "city" character varying,
        "nomineeName" character varying NOT NULL,
        "nomineeRelationship" "public"."individuals_nomineerelationship_enum" NOT NULL,
        "nomineeCnic" character varying(13) NOT NULL,
        "nomineeMobile" character varying NOT NULL,
        "nomineeEmail" character varying,
        "nomineeAddress" character varying,
        "nomineeCity" character varying,
        "consentEnrollment" boolean NOT NULL DEFAULT true,
        "consentIdentityVerification" boolean NOT NULL DEFAULT true,
        "consentTermsAccepted" boolean NOT NULL DEFAULT true,
        "consentDeclarationAccepted" boolean NOT NULL DEFAULT true,
        "status" "public"."students_status_enum" NOT NULL DEFAULT 'pending',
        "reviewedByUserId" uuid,
        "reviewedAt" TIMESTAMP WITH TIME ZONE,
        "reviewNote" text,
        "certificateIssued" boolean NOT NULL DEFAULT false,
        "certificateNumber" character varying,
        "certificateIssuedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_individuals_userId" ON "individuals" ("userId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_individuals_cnicNumber" ON "individuals" ("cnicNumber")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_individuals_certificateNumber" ON "individuals" ("certificateNumber") WHERE "certificateNumber" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_individuals_status" ON "individuals" ("status")`,
    );

    await queryRunner.query(`
      ALTER TABLE "individuals"
      ADD CONSTRAINT "FK_individuals_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE "individual_cards" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "individualId" uuid NOT NULL,
        "cardNumber" character varying NOT NULL,
        "status" "public"."cards_status_enum" NOT NULL DEFAULT 'pending_verification',
        "issuedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "verificationCode" character varying,
        "verificationCodeExpiresAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_individual_cards_individualId" ON "individual_cards" ("individualId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_individual_cards_cardNumber" ON "individual_cards" ("cardNumber")`,
    );

    await queryRunner.query(`
      ALTER TABLE "individual_cards"
      ADD CONSTRAINT "FK_individual_cards_individualId"
      FOREIGN KEY ("individualId") REFERENCES "individuals"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "individual_cards" DROP CONSTRAINT "FK_individual_cards_individualId"`,
    );
    await queryRunner.query(`DROP TABLE "individual_cards"`);

    await queryRunner.query(
      `ALTER TABLE "individuals" DROP CONSTRAINT "FK_individuals_userId"`,
    );
    await queryRunner.query(`DROP TABLE "individuals"`);

    await queryRunner.query(
      `DROP TYPE "public"."individuals_nomineerelationship_enum"`,
    );
  }
}
