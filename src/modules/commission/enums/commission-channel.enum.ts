/**
 * The three channels that earn a per-registration commission. Stored as a plain
 * string on commission rows (no PG enum) so adding a channel later needs no
 * enum migration.
 */
export enum CommissionChannel {
  FRANCHISE = 'franchise', // area-manager franchise → individual registrations
  SCHOOL = 'school', // institution → student registrations
  CORPORATE = 'corporate', // company → employee registrations
}

export const COMMISSION_CHANNELS: CommissionChannel[] = [
  CommissionChannel.FRANCHISE,
  CommissionChannel.SCHOOL,
  CommissionChannel.CORPORATE,
];
