import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchoolClasses1788240000000 implements MigrationInterface {
  name = 'AddSchoolClasses1788240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "school_classes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "institutionId" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "academicYear" character varying(20),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_school_classes_institutionId" ON "school_classes" ("institutionId")
    `);

    await queryRunner.query(`
      ALTER TABLE "school_classes"
      ADD CONSTRAINT "FK_school_classes_institutionId"
      FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "students" ADD COLUMN "classId" uuid
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_students_classId" ON "students" ("classId")
    `);

    await queryRunner.query(`
      ALTER TABLE "students"
      ADD CONSTRAINT "FK_students_classId"
      FOREIGN KEY ("classId") REFERENCES "school_classes"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "students" DROP CONSTRAINT "FK_students_classId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_students_classId"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "classId"`);

    await queryRunner.query(
      `ALTER TABLE "school_classes" DROP CONSTRAINT "FK_school_classes_institutionId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_school_classes_institutionId"`,
    );
    await queryRunner.query(`DROP TABLE "school_classes"`);
  }
}
