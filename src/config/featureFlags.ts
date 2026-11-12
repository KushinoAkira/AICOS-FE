/** Defaults for the proposal's open questions. Flip here when the team decides otherwise. */
export const featureFlags = {
  /** UC-02: "link" = reset link with expiring token, "otp" = 6-digit code. */
  resetMethod: "link" as "link" | "otp",
  /** UC-22: renew button is simulated (no real billing). */
  renewSimulated: true,
  /** UC-43: cashier only looks up the transaction status, never confirms by eye (BR-26). */
  paymentLookupOnly: true,
  /** UC-58: only signed-in members can rate an order. */
  feedbackMembersOnly: true,
  /**
   * Voucher field on the takeaway menu. Turn on once the backend lets a member redeem on their own order
   * (takeaway-voucher-redeem.patch): today `POST /customers/vouchers/redeem` admits staff only, and Ordering forwards the customer's
   * token, so a takeaway order with a code is refused (403).
   */
  voucherAtTakeaway: false,
  /**
   * Voucher field on the table QR menu, for signed-in members only. Turn on once `POST /orders/qr/checkout` takes `promotionCode`
   * (qr-checkout-promotion-code.patch) and the redeem patch above is in. A guest without an account has no token to redeem with.
   */
  voucherAtQr: false,
}
