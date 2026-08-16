import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentSetupTokenFields1788203000000
  implements MigrationInterface
{
  name = 'AddStudentSetupTokenFields1788203000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "setupToken" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "setupTokenExpiresAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "userId" uuid`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_students_userId" ON "students" ("userId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "students" ADD CONSTRAINT IF NOT EXISTS "FK_students_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "FK_students_userId"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_students_userId"`,
    );

    await queryRunner.query(
      `ALTER TABLE "students" DROP COLUMN IF EXISTS "userId"`,
    );

    await queryRunner.query(
      `ALTER TABLE "students" DROP COLUMN IF EXISTS "setupTokenExpiresAt"`,
    );

    await queryRunner.query(
      `ALTER TABLE "students" DROP COLUMN IF EXISTS "setupToken"`,
    );
  }
}
