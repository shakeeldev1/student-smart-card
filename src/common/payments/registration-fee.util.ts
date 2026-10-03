import { MAX_PRODUCT_VARIANT, MIN_PRODUCT_VARIANT } from '../insurance/coverage.util';

/**
 * Registration fee derived from the chosen EFU product variant (Takaful plan):
 * variant 1 = 1,000, variant 2 = 2,000, … variant 10 = 10,000 (PKR). The fee is
 * always derived from the stored variant so the two can never drift.
 */
export const REGISTRATION_FEE_PER_VARIANT = 1_000;

/** Fee (PKR) for a variant, or null when the variant is missing/out of range. */
export function registrationFeeForVariant(variant?: number | null): number | null {
  const n = Number(variant);
  if (!Number.isInteger(n) || n < MIN_PRODUCT_VARIANT || n > MAX_PRODUCT_VARIANT) {
    return null;
  }
  return n * REGISTRATION_FEE_PER_VARIANT;
}
