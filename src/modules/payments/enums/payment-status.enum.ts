/** Lifecycle of a manual registration payment. */
export enum PaymentStatus {
  /** Proof uploaded by the payer, awaiting admin verification. */
  PENDING = 'pending',
  /** Admin verified the payment — the application moves to EFU review. */
  CONFIRMED = 'confirmed',
  /** Admin rejected the proof — the payer can re-submit. */
  REJECTED = 'rejected',
}
