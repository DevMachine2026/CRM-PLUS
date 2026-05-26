export interface PasswordResetEmailParams {
  to: string;
  resetUrl: string;
  name: string;
}

/**
 * Password-reset notification. No transactional provider is configured.
 * Development: logs the reset URL to the server console for manual testing.
 * Production: no-op (API still returns a generic success message).
 */
export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams,
): Promise<void> {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info(
    "[email] password reset (development only — not sent):",
    params.to,
    params.resetUrl,
  );
}
