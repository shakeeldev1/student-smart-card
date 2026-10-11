import { provinceCode, districtCode } from '../../common/geo/pakistan-geo-codes';

/**
 * Build a meaningful, bank-branch-style franchise code:
 *   SSC-<PP><DD>-<NNNN>
 * where PP = province code, DD = district code (00 when none), and NNNN is a
 * zero-padded serial unique within that province+district prefix. The region
 * is readable straight off the code, like a bank branch number.
 */
export function franchiseCodePrefix(
  province?: string | null,
  district?: string | null,
): string {
  return `SSC-${provinceCode(province)}${districtCode(province, district)}-`;
}

export function buildFranchiseCode(
  province: string | null | undefined,
  district: string | null | undefined,
  serial: number,
): string {
  const n = String(serial).padStart(4, '0');
  return `${franchiseCodePrefix(province, district)}${n}`;
}

/**
 * Reference codes for the other partner channels, same bank-branch style but
 * tagged by channel so the code is self-describing:
 *   schools    -> SSC-SCH-<PP><DD>-<NNNN>
 *   corporates -> SSC-COR-<PP><DD>-<NNNN>
 * These identify the partner for admin management and payouts; attribution of
 * who they enrolled still rides the existing institutionId / companyId links.
 */
export type ReferralKind = 'SCH' | 'COR';

export function referralCodePrefix(
  kind: ReferralKind,
  province?: string | null,
  district?: string | null,
): string {
  return `SSC-${kind}-${provinceCode(province)}${districtCode(province, district)}-`;
}

export function buildReferralCode(
  kind: ReferralKind,
  province: string | null | undefined,
  district: string | null | undefined,
  serial: number,
): string {
  const n = String(serial).padStart(4, '0');
  return `${referralCodePrefix(kind, province, district)}${n}`;
}
