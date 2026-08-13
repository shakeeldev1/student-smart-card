import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1786625539475 implements MigrationInterface {
  name = 'InitSchema1786625539475';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('parent', 'school', 'operator')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "phone" character varying, "name" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL, "emailVerified" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users"  ("email") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."email_otps_purpose_enum" AS ENUM('EMAIL_VERIFICATION', 'PASSWORD_RESET')`,
    );
    await queryRunner.query(
      `CREATE TABLE "email_otps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "purpose" "public"."email_otps_purpose_enum" NOT NULL, "codeHash" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "consumedAt" TIMESTAMP WITH TIME ZONE, "attempts" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c66a6bae8086377ae2b0f5b177e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7a5d6aea244cd5efae900a44d6" ON "email_otps"  ("userId", "purpose", "consumedAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "tokenHash" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revokedAt" TIMESTAMP WITH TIME ZONE, "replacedByTokenId" uuid, "userAgent" character varying, "ipAddress" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_610102b60fea1455310ccd299d" ON "refresh_tokens"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c25bc63d248ca90e8dcc1d92d0" ON "refresh_tokens"  ("tokenHash") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."institutions_type_enum" AS ENUM('government', 'private', 'college', 'university', 'madrassa', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."institutions_approvalstatus_enum" AS ENUM('pending_review', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "institutions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ownerUserId" uuid NOT NULL, "name" character varying NOT NULL, "registrationNumber" character varying NOT NULL, "type" "public"."institutions_type_enum" NOT NULL, "address" character varying NOT NULL, "city" character varying NOT NULL, "contactNumber" character varying NOT NULL, "officialEmail" character varying NOT NULL, "principalName" character varying NOT NULL, "authorizedPersonName" character varying NOT NULL, "authorizedPersonDesignation" character varying NOT NULL, "authorizedPersonCnic" character varying(13) NOT NULL, "authorizedPersonMobile" character varying NOT NULL, "numberOfStudents" integer NOT NULL, "approvalStatus" "public"."institutions_approvalstatus_enum" NOT NULL DEFAULT 'pending_review', "approvedByUserId" uuid, "approvedAt" TIMESTAMP WITH TIME ZONE, "rejectionReason" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0be7539dcdba335470dc05e9690" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a31f38a90569d9a0ad14a959b0" ON "institutions"  ("ownerUserId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_890e3855fa25fbe68998beba9b" ON "institutions"  ("registrationNumber") `,
    );
    await queryRunner.query(
      `ALTER TABLE "email_otps" ADD CONSTRAINT "FK_feb32eedcddde6b353669a0a973" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" ADD CONSTRAINT "FK_a31f38a90569d9a0ad14a959b0f" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "institutions" DROP CONSTRAINT "FK_a31f38a90569d9a0ad14a959b0f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_otps" DROP CONSTRAINT "FK_feb32eedcddde6b353669a0a973"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_890e3855fa25fbe68998beba9b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a31f38a90569d9a0ad14a959b0"`,
    );
    await queryRunner.query(`DROP TABLE "institutions"`);
    await queryRunner.query(
      `DROP TYPE "public"."institutions_approvalstatus_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."institutions_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c25bc63d248ca90e8dcc1d92d0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_610102b60fea1455310ccd299d"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7a5d6aea244cd5efae900a44d6"`,
    );
    await queryRunner.query(`DROP TABLE "email_otps"`);
    await queryRunner.query(`DROP TYPE "public"."email_otps_purpose_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
