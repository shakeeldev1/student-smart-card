import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Public website reviews/testimonials, shown only after admin approval.
 */
export class AddReviews1788460000000 implements MigrationInterface {
  name = 'AddReviews1788460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "reviews_status_enum" AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "email" character varying,
        "role" character varying,
        "city" character varying,
        "rating" integer NOT NULL DEFAULT 5,
        "message" text NOT NULL,
        "photoUrl" character varying,
        "photoPublicId" character varying,
        "status" "reviews_status_enum" NOT NULL DEFAULT 'pending',
        "reviewedBy" uuid,
        "reviewedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reviews" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_reviews_status" ON "reviews" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reviews_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reviews_status_enum"`);
  }
}
