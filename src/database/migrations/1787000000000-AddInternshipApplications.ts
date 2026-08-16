import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInternshipApplications1787000000000
  implements MigrationInterface
{
  name = 'AddInternshipApplications1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."internship_applications_gender_enum" AS ENUM('male', 'female', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."internship_applications_internshipareafield_enum" AS ENUM('it', 'marketing', 'finance', 'hr', 'business_development', 'graphic_design', 'digital_marketing', 'engineering', 'media', 'education', 'healthcare', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."internship_applications_preferredduration_enum" AS ENUM('1_month', '2_months', '3_months', '6_months')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."internship_applications_internshiptype_enum" AS ENUM('unpaid_only')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."internship_applications_modeofinternship_enum" AS ENUM('on_site', 'remote', 'hybrid')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."internship_applications_status_enum" AS ENUM('pending', 'approved', 'changes_requested', 'rejected')`,
    );

    await queryRunner.query(
      `CREATE TABLE "internship_applications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fullName" character varying NOT NULL,
        "fatherGuardianName" character varying NOT NULL,
        "dateOfBirth" date NOT NULL,
        "gender" "public"."internship_applications_gender_enum" NOT NULL,
        "bFormOrCnicNo" character varying(20) NOT NULL,
        "mobileNumber" character varying(20) NOT NULL,
        "emailAddress" character varying NOT NULL,
        "currentAddress" character varying NOT NULL,
        "cityDistrict" character varying(120) NOT NULL,
        "institutionName" character varying NOT NULL,
        "studentRegistrationNo" character varying(80) NOT NULL,
        "currentClassDegree" character varying(120) NOT NULL,
        "programMajorSubject" character varying(120) NOT NULL,
        "currentSemesterYear" character varying(80) NOT NULL,
        "expectedGraduationYear" character varying(4) NOT NULL,
        "marksCgpa" character varying(30) NOT NULL,
        "internshipAreaField" "public"."internship_applications_internshipareafield_enum" NOT NULL,
        "preferredInternshipLocation" character varying(120) NOT NULL,
        "preferredDuration" "public"."internship_applications_preferredduration_enum" NOT NULL,
        "preferredStartDate" date NOT NULL,
        "internshipType" "public"."internship_applications_internshiptype_enum" NOT NULL DEFAULT 'unpaid_only',
        "modeOfInternship" "public"."internship_applications_modeofinternship_enum" NOT NULL,
        "technicalSkills" text NOT NULL,
        "softSkills" text NOT NULL,
        "previousInternshipExperience" text NOT NULL,
        "projectsAchievements" text NOT NULL,
        "certifications" text NOT NULL,
        "recentPhotographPath" character varying NOT NULL,
        "studentCardInstitutionIdPath" character varying NOT NULL,
        "academicCertificateTranscriptPath" character varying NOT NULL,
        "recommendationLetterNocPath" character varying NOT NULL,
        "emergencyContactName" character varying(150) NOT NULL,
        "emergencyContactRelationship" character varying(80) NOT NULL,
        "emergencyContactMobileNumber" character varying(20) NOT NULL,
        "declarationAccepted" boolean NOT NULL DEFAULT false,
        "termsAccepted" boolean NOT NULL DEFAULT false,
        "registeredByUserId" uuid NOT NULL,
        "status" "public"."internship_applications_status_enum" NOT NULL DEFAULT 'pending',
        "reviewedByUserId" uuid,
        "reviewedAt" TIMESTAMP WITH TIME ZONE,
        "reviewNote" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_2c45e3a8f72ce4ebf87c4514e17" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_23edfd3f7d36d35c81f8d4a22f" ON "internship_applications" ("bFormOrCnicNo")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4e4cbcaef1f66ca4d16f7d4ce1" ON "internship_applications" ("registeredByUserId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_851a37408eb9d8d5bd74574dd6" ON "internship_applications" ("status")`,
    );
    await queryRunner.query(
      `ALTER TABLE "internship_applications" ADD CONSTRAINT "FK_58a4e47e66d2f56caadce1f6f52" FOREIGN KEY ("registeredByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "internship_applications" DROP CONSTRAINT "FK_58a4e47e66d2f56caadce1f6f52"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_851a37408eb9d8d5bd74574dd6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4e4cbcaef1f66ca4d16f7d4ce1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_23edfd3f7d36d35c81f8d4a22f"`,
    );
    await queryRunner.query(`DROP TABLE "internship_applications"`);
    await queryRunner.query(`DROP TYPE "public"."internship_applications_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."internship_applications_modeofinternship_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."internship_applications_internshiptype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."internship_applications_preferredduration_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."internship_applications_internshipareafield_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."internship_applications_gender_enum"`,
    );
  }
}
