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
}
