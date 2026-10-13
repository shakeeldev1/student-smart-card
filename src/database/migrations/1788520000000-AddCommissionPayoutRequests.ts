import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommissionPayoutRequests1788520000000 implements MigrationInterface {
  name = 'AddCommissionPayoutRequests1788520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "commission_payout_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "channel" character varying NOT NULL,
        "partnerId" uuid NOT NULL,
        "amount" integer NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "adminNote" character varying,
        "paymentReference" character varying,
        "reviewedByUserId" uuid,
        "reviewedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_commission_payout_requests" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_commission_payout_requests_channel" ON "commission_payout_requests" ("channel")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_commission_payout_requests_partnerId" ON "commission_payout_requests" ("partnerId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "commission_payout_requests"`);
  }
}
