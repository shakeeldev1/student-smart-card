import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Commission ledger: snapshot a per-registration commission on the payment row
 * at confirmation time, add per-variant rate overrides and a payouts table, and
 * backfill already-confirmed, attributed payments at the current flat rates.
 */
export class AddCommissionLedger1788510000000 implements MigrationInterface {
  name = 'AddCommissionLedger1788510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Snapshot columns on payments.
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "commissionChannel" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "commissionPartnerId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "commissionAmount" integer`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payments_commissionPartnerId" ON "payments" ("commissionPartnerId")`,
    );

    // 2. Per-variant rate overrides.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "commission_rates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "channel" character varying NOT NULL,
        "productVariant" integer NOT NULL,
        "amount" integer NOT NULL,
        "updatedByUserId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_commission_rates" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_commission_rates_channel_variant" ON "commission_rates" ("channel", "productVariant")`,
    );

    // 3. Payouts.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "commission_payouts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "channel" character varying NOT NULL,
        "partnerId" uuid NOT NULL,
        "amount" integer NOT NULL,
        "reference" character varying,
        "paidByUserId" uuid,
        "paidAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_commission_payouts" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_commission_payouts_channel" ON "commission_payouts" ("channel")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_commission_payouts_partnerId" ON "commission_payouts" ("partnerId")`,
    );

    // 4. Backfill confirmed + attributed payments at the current flat rates.
    //    commission_rates is empty here, so COALESCE falls to the flat default.
    await queryRunner.query(`
      UPDATE "payments" p
      SET "commissionChannel" = 'school',
          "commissionPartnerId" = s."institutionId",
          "commissionAmount" = COALESCE(
            (SELECT fs."commissionPerStudent" FROM "franchise_settings" fs ORDER BY fs."createdAt" ASC LIMIT 1), 0)
      FROM "students" s
      WHERE p."studentId" = s.id
        AND p."status" = 'confirmed'
        AND s."institutionId" IS NOT NULL
        AND p."commissionAmount" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "payments" p
      SET "commissionChannel" = 'franchise',
          "commissionPartnerId" = i."franchiseId",
          "commissionAmount" = COALESCE(
            (SELECT fs."commissionPerIndividual" FROM "franchise_settings" fs ORDER BY fs."createdAt" ASC LIMIT 1), 0)
      FROM "individuals" i
      WHERE p."individualId" = i.id
        AND p."status" = 'confirmed'
        AND i."franchiseId" IS NOT NULL
        AND p."commissionAmount" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "payments" p
      SET "commissionChannel" = 'corporate',
          "commissionPartnerId" = e."companyId",
          "commissionAmount" = COALESCE(
            (SELECT fs."commissionPerEmployee" FROM "franchise_settings" fs ORDER BY fs."createdAt" ASC LIMIT 1), 0)
      FROM "employees" e
      WHERE p."employeeId" = e.id
        AND p."status" = 'confirmed'
        AND e."companyId" IS NOT NULL
        AND p."commissionAmount" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "commission_payouts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "commission_rates"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payments_commissionPartnerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "commissionAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "commissionPartnerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "commissionChannel"`,
    );
  }
}
