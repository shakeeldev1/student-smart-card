import { CardStatus } from '../../cards/enums/card-status.enum';
import { Gender } from '../../students/enums/gender.enum';

export type CardHolderType = 'student' | 'individual';

/**
 * Response shape for GET /integrations/ecommerce/cards/:cardNumber/profile.
 * Consumed by the e-commerce platform (SSC) to sync a local account when a
 * holder activates their card there. See EXTERNAL_INTEGRATION_SPEC.md in
 * that project for the full contract this implements.
 *
 * Fields after `issuedAt` were added later; consumers must treat them as
 * optional. School-only fields are always null for individual holders.
 */
export class CardHolderProfileResponseDto {
  cardNumber: string;
  cardStatus: CardStatus;
  holderType: CardHolderType;
  fullName: string;
  email: string | null;
  contactNumber: string | null;
  dateOfBirth: string;
  gender: Gender;
  photoUrl: string | null;
  institutionName: string | null;
  className: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
  /** True only when the student belongs to a registered partner institution. */
  institutionVerified: boolean;
  institutionLogoUrl: string | null;
  sectionName: string | null;
  rollNumber: string | null;
  /** EFU takaful product variant (1–10), or null if unset. */
  productVariant: number | null;
  /** Derived coverage in PKR (variant × 100,000), or null if no variant. */
  coverageAmount: number | null;

  // --- Extended cardholder details (added later; consumers must treat all as
  // optional). These let the e-commerce platform render the full physical card
  // face identically to this system. School-only fields are null for
  // individuals and vice-versa.
  /** Father's name (both holder types). */
  fatherName: string | null;
  /** Student B-Form number (school-linked students only). */
  bFormNumber: string | null;
  /** CNIC number (individual holders only). */
  cnicNumber: string | null;
  /** Holder's address line — guardian's address for students, own for individuals. */
  address: string | null;
  /** Holder's city — guardian's city for students, own for individuals. */
  city: string | null;
  // Emergency contact: guardian (students) / nominee (individuals).
  guardianName: string | null;
  /** Raw relationship enum value, e.g. "father" | "mother" | "legal_guardian". */
  guardianRelationship: string | null;
  guardianMobile: string | null;
  nomineeName: string | null;
  /** Raw relationship enum value, e.g. "spouse" | "parent" | "sibling" | "child" | "other". */
  nomineeRelationship: string | null;
  nomineeMobile: string | null;
  // Issuing institution contact (school-linked students only), for the
  // "If found, please return to" footer.
  institutionAddress: string | null;
  institutionCity: string | null;
  institutionContact: string | null;
}
