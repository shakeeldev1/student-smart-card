import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCards1786642384223 implements MigrationInterface {
  name = 'AddCards1786642384223';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."cards_status_enum" AS ENUM('active', 'suspended', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TABLE "cards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "studentId" uuid NOT NULL, "cardNumber" character varying NOT NULL, "status" "public"."cards_status_enum" NOT NULL DEFAULT 'active', "issuedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_49d83b8c9d1e3163231dfb6c91" UNIQUE ("studentId"), CONSTRAINT "PK_5f3269634705fdff4a9935860fc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_49d83b8c9d1e3163231dfb6c91" ON "cards"  ("studentId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c3c9b9ffb9dcd3a091df3ee08c" ON "cards"  ("cardNumber") `,
    );
    await queryRunner.query(
      `ALTER TABLE "cards" ADD CONSTRAINT "FK_49d83b8c9d1e3163231dfb6c913" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cards" DROP CONSTRAINT "FK_49d83b8c9d1e3163231dfb6c913"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c3c9b9ffb9dcd3a091df3ee08c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_49d83b8c9d1e3163231dfb6c91"`,
    );
    await queryRunner.query(`DROP TABLE "cards"`);
    await queryRunner.query(`DROP TYPE "public"."cards_status_enum"`);
  }
}
