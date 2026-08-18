import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSections1788280000000 implements MigrationInterface {
  name = 'AddSections1788280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sections" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "classId" uuid NOT NULL,
        "name" character varying(50) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sections_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_sections_classId" ON "sections" ("classId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_sections_classId_name" ON "sections" ("classId", "name")`,
    );
    await queryRunner.query(`
      ALTER TABLE "sections"
      ADD CONSTRAINT "FK_sections_classId"
      FOREIGN KEY ("classId") REFERENCES "school_classes"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(
      `ALTER TABLE "students" ADD COLUMN "sectionId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_students_sectionId" ON "students" ("sectionId")`,
    );
    await queryRunner.query(`
      ALTER TABLE "students"
      ADD CONSTRAINT "FK_students_sectionId"
      FOREIGN KEY ("sectionId") REFERENCES "sections"("id")
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "students" DROP CONSTRAINT "FK_students_sectionId"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_students_sectionId"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "sectionId"`);
    await queryRunner.query(`DROP TABLE "sections"`);
  }
}
