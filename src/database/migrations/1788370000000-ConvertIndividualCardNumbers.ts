import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomInt } from 'crypto';
import {
  SSCP_PREFIX,
  provinceCode,
  districtCode,
} from '../../common/geo/pakistan-geo-codes';

/**
 * Converts existing individual card numbers from the legacy "IND-CARD-XXXX"
 * format to the bank-style 16-digit number used by student cards:
 *   7727 (SSCP) + PP (province) + DD (district) + 8 random digits.
 * Numbers are kept unique across both student (`cards`) and individual
 * (`individual_cards`) tables. Irreversible — the old IND-CARD numbers are not
 * preserved (any external reference to an old number stops matching).
 */
export class ConvertIndividualCardNumbers1788370000000 implements MigrationInterface {
  name = 'ConvertIndividualCardNumbers1788370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Every number already in use, so regenerated numbers never collide.
    const existing: Array<{ cardNumber: string }> = await queryRunner.query(
      `SELECT "cardNumber" FROM "cards"
       UNION ALL
       SELECT "cardNumber" FROM "individual_cards"`,
    );
    const used = new Set(existing.map((row) => row.cardNumber));

    const cards: Array<{ id: string; province: string | null; district: string | null }> =
      await queryRunner.query(
        `SELECT ic."id", i."province", i."district"
         FROM "individual_cards" ic
         JOIN "individuals" i ON i."id" = ic."individualId"
         WHERE ic."cardNumber" LIKE 'IND-CARD-%'`,
      );

    for (const card of cards) {
      const prefix = `${SSCP_PREFIX}${provinceCode(card.province)}${districtCode(
        card.province,
        card.district,
      )}`;
      let next: string | null = null;
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const candidate = `${prefix}${String(randomInt(0, 100_000_000)).padStart(8, '0')}`;
        if (!used.has(candidate)) {
          next = candidate;
          break;
        }
      }
      if (!next) {
        throw new Error(`Could not generate a unique card number for individual card ${card.id}`);
      }
      used.add(next);
      await queryRunner.query(
        `UPDATE "individual_cards" SET "cardNumber" = $1 WHERE "id" = $2`,
        [next, card.id],
      );
    }
  }

  public async down(): Promise<void> {
    // Irreversible: the original IND-CARD-XXXX numbers were not retained.
  }
}
