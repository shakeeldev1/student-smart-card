/**
 * How a registration payment was made. Only manual bank transfer today; a
 * future online gateway adds its own value here without touching the lifecycle.
 */
export enum PaymentMethod {
  MANUAL_BANK_TRANSFER = 'manual_bank_transfer',
  GATEWAY = 'gateway',
}
