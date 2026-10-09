/**
 * How a registration payment was made. Only manual bank transfer today; a
 * future online gateway adds its own value here without touching the lifecycle.
 */
export enum PaymentMethod {
  MANUAL_BANK_TRANSFER = 'manual_bank_transfer',
  GATEWAY = 'gateway',
  /**
   * Paid offline (cash in person, or by a relative/friend) and confirmed by an
   * admin without an uploaded proof. Lets staff clear a registration that was
   * settled outside the normal upload flow.
   */
  CASH = 'cash',
}
