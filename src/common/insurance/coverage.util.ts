/**
 * Product variant → takaful/insurance coverage mapping.
 *
 * The EFU Hemayah-WTO plan uses a product variant from 1 to 10; the coverage is a
 * straight multiple: variant 1 = 100,000, variant 2 = 200,000, … variant 10 =
 * 1,000,000 (PKR). Coverage is always derived from the stored variant so the
 * two can never drift out of sync.
 */
export const COVERAGE_PER_VARIANT = 100_000;
export const MIN_PRODUCT_VARIANT = 1;
export const MAX_PRODUCT_VARIANT = 10;

/** Coverage amount (PKR) for a variant, or null when no variant is set. */
export function coverageForVariant(
  variant?: number | null,
): number | null {
  if (variant === null || variant === undefined) {
    return null;
  }
  return variant * COVERAGE_PER_VARIANT;
}
