import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Corporate flow: companies (mirroring institutions, operator-approved) that
 * enroll employees (mirroring students — same Takaful payment → admin → EFU →
 * card lifecycle). Adds companies, employees, employee_cards, and an
 * employeeId column on payments.
 */
export class AddCorporate1788410000000 implements MigrationInterface {
  name = 'AddCorporate1788410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- Enums ----
    await queryRunner.query(
      `CREATE TYPE "public"."companies_approvalstatus_enum" AS ENUM('pending_review', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."employees_gender_enum" AS ENUM('male', 'female')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."employees_status_enum" AS ENUM('pending', 'approved', 'changes_requested', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."employee_cards_status_enum" AS ENUM('pending_verification', 'active', 'suspended', 'expired')`,
    );

    // ---- companies ----
    await queryRunner.query(
      `CREATE TABLE "companies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ownerUserId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "registrationNumber" character varying NOT NULL,
        "address" character varying NOT NULL,
        "city" character varying NOT NULL,
        "province" character varying,
        "region" character varying,
        "district" character varying,
        "tehsil" character varying,
        "contactNumber" character varying NOT NULL,
        "officialEmail" character varying NOT NULL,
        "hrPersonName" character varying NOT NULL,
        "authorizedPersonDesignation" character varying NOT NULL,
        "authorizedPersonCnic" character varying(13) NOT NULL,
        "authorizedPersonMobile" character varying NOT NULL,
        "numberOfEmployees" integer NOT NULL,
        "logoUrl" character varying,
        "logoPublicId" character varying,
        "approvalStatus" "public"."companies_approvalstatus_enum" NOT NULL DEFAULT 'pending_review',
        "approvedByUserId" uuid,
        "approvedAt" TIMESTAMP WITH TIME ZONE,
        "rejectionReason" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_companies" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_companies_ownerUserId" ON "companies" ("ownerUserId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_companies_registrationNumber" ON "companies" ("registrationNumber")`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD CONSTRAINT "FK_companies_owner" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // ---- employees ----
    await queryRunner.query(
      `CREATE TABLE "employees" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fullName" character varying NOT NULL,
        "photoUrl" character varying,
        "photoPublicId" character varying,
        "fatherOrHusbandName" character varying NOT NULL,
        "cnicNumber" character varying(13) NOT NULL,
        "dateOfBirth" date NOT NULL,
        "gender" "public"."employees_gender_enum" NOT NULL,
        "employeeCode" character varying,
        "department" character varying,
        "designation" character varying,
        "joiningDate" date,
        "branchLocation" character varying,
        "province" character varying,
        "region" character varying,
        "district" character varying,
        "tehsil" character varying,
        "contactNumber" character varying,
        "email" character varying,
        "productVariant" integer,
        "nomineeName" character varying NOT NULL,
        "nomineeRelationship" character varying NOT NULL,
        "nomineeCnic" character varying(13),
        "nomineeDateOfBirth" date,
        "nomineeMobile" character varying,
        "consentEnrollment" boolean NOT NULL DEFAULT true,
        "consentIdentityVerification" boolean NOT NULL DEFAULT true,
        "consentTermsAccepted" boolean NOT NULL DEFAULT true,
        "consentDeclarationAccepted" boolean NOT NULL DEFAULT true,
        "companyId" uuid,
        "registeredByUserId" uuid NOT NULL,
        "status" "public"."employees_status_enum" NOT NULL DEFAULT 'pending',
        "reviewedByUserId" uuid,
        "reviewedAt" TIMESTAMP WITH TIME ZONE,
        "reviewNote" text,
        "certificateIssued" boolean NOT NULL DEFAULT false,
        "certificateNumber" character varying,
        "certificateIssuedAt" TIMESTAMP WITH TIME ZONE,
        "publicToken" character varying,
        "setupToken" character varying,
        "setupTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "userId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_employees" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_employees_cnicNumber" ON "employees" ("cnicNumber")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_employees_certificateNumber" ON "employees" ("certificateNumber")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_employees_publicToken" ON "employees" ("publicToken")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_employees_companyId" ON "employees" ("companyId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_employees_registeredByUserId" ON "employees" ("registeredByUserId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_employees_status" ON "employees" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_employees_userId" ON "employees" ("userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_registeredBy" FOREIGN KEY ("registeredByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // ---- employee_cards ----
    await queryRunner.query(
      `CREATE TABLE "employee_cards" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employeeId" uuid NOT NULL,
        "cardNumber" character varying NOT NULL,
        "status" "public"."employee_cards_status_enum" NOT NULL DEFAULT 'pending_verification',
        "issuedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "verificationCode" character varying,
        "verificationCodeExpiresAt" TIMESTAMP WITH TIME ZONE,
        "expiresAt" TIMESTAMP WITH TIME ZONE,
        "verificationAttempts" integer NOT NULL DEFAULT 0,
        "verificationCodeSentAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_employee_cards" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_employee_cards_employeeId" ON "employee_cards" ("employeeId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_employee_cards_cardNumber" ON "employee_cards" ("cardNumber")`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee_cards" ADD CONSTRAINT "FK_employee_cards_employee" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // ---- payments.employeeId ----
    await queryRunner.query(`ALTER TABLE "payments" ADD "employeeId" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_employeeId" ON "payments" ("employeeId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_employee" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_employee"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_employeeId"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "employeeId"`);

    await queryRunner.query(`DROP TABLE "employee_cards"`);
    await queryRunner.query(`DROP TABLE "employees"`);
    await queryRunner.query(`DROP TABLE "companies"`);

    await queryRunner.query(`DROP TYPE "public"."employee_cards_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."employees_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."employees_gender_enum"`);
    await queryRunner.query(`DROP TYPE "public"."companies_approvalstatus_enum"`);
  }
}
