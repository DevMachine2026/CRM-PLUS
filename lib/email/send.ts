import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.RESEND_FROM_EMAIL ?? "CRM PLUS <noreply@resend.dev>";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping send:", payload.subject, "→", payload.to);
    return;
  }
  const { error } = await resend.emails.send({
    from:    FROM,
    to:      payload.to,
    subject: payload.subject,
    html:    payload.html,
  });
  if (error) throw new Error(`[email] Resend error: ${error.message}`);
}
