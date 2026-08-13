import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudents1786638596061 implements MigrationInterface {
  name = 'AddStudents1786638596061';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."students_gender_enum" AS ENUM('male', 'female')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."students_guardianrelationship_enum" AS ENUM('father', 'mother', 'legal_guardian')`,
    );
    await queryRunner.query(
      `CREATE TABLE "students" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fullName" character varying NOT NULL, "fatherName" character varying NOT NULL, "motherName" character varying, "dateOfBirth" date NOT NULL, "gender" "public"."students_gender_enum" NOT NULL, "bFormNumber" character varying(13) NOT NULL, "className" character varying NOT NULL, "contactNumber" character varying, "email" character varying, "guardianName" character varying NOT NULL, "guardianCnic" character varying(13) NOT NULL, "guardianRelationship" "public"."students_guardianrelationship_enum" NOT NULL, "guardianMobile" character varying, "guardianEmail" character varying, "guardianAddress" character varying, "guardianCity" character varying, "institutionId" uuid, "registeredByUserId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7d7f07271ad4ce999880713f05e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_08f069dcb12c7c3752b56347f8" ON "students"  ("bFormNumber") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d5ef1aaf8d648399bdcdf576db" ON "students"  ("institutionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9e49af06193b5d16d7194938f0" ON "students"  ("registeredByUserId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD CONSTRAINT "FK_d5ef1aaf8d648399bdcdf576dbb" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD CONSTRAINT "FK_9e49af06193b5d16d7194938f0d" FOREIGN KEY ("registeredByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "students" DROP CONSTRAINT "FK_9e49af06193b5d16d7194938f0d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP CONSTRAINT "FK_d5ef1aaf8d648399bdcdf576dbb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9e49af06193b5d16d7194938f0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d5ef1aaf8d648399bdcdf576db"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_08f069dcb12c7c3752b56347f8"`,
    );
    await queryRunner.query(`DROP TABLE "students"`);
    await queryRunner.query(
      `DROP TYPE "public"."students_guardianrelationship_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."students_gender_enum"`);
  }
}
