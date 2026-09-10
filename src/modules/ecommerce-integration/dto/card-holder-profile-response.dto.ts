import { CardStatus } from '../../cards/enums/card-status.enum';
import { Gender } from '../../students/enums/gender.enum';

export type CardHolderType = 'student' | 'individual';

/**
 * Response shape for GET /integrations/ecommerce/cards/:cardNumber/profile.
 * Consumed by the e-commerce platform (SSC) to sync a local account when a
 * holder activates their card there. See EXTERNAL_INTEGRATION_SPEC.md in
 * that project for the full contract this implements.
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
}
