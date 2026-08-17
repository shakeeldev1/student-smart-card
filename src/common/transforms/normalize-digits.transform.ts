// Strips spaces, dashes, and parentheses that people naturally type into
// CNIC/phone fields (e.g. "0300-1234567", "12345-1234567-1") before the
// digit-only @Matches validators run, so a correctly-formatted number isn't
// rejected just for including the punctuation everyone actually uses.
export function normalizeDigits({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.replace(/[\s\-()]/g, '') : value;
}
