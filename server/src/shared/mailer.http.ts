/**
 * HTTP email transport (Brevo).
 *
 * WHY THIS EXISTS
 * SMTP is a separate protocol on its own ports (25, 465, 587). Free hosting
 * tiers routinely block outbound traffic on those ports, because "free host +
 * SMTP" is how spam campaigns get sent. When that happens no SMTP setting
 * helps — the connection simply never completes, and nodemailer reports
 * "Connection timeout".
 *
 * This sends the same email as an ordinary HTTPS POST instead. Port 443 is the
 * web itself; a host that blocked it could not serve your API at all. So this
 * works everywhere SMTP does, plus everywhere SMTP is blocked.
 *
 * Brevo's free tier allows 300 emails/day and verifies a single sender address
 * by email — no domain ownership required, which matters when you do not own
 * one. Sign up, verify the sender, create an API key, set BREVO_API_KEY.
 *
 * Chosen automatically when BREVO_API_KEY is set; SMTP is used otherwise, so
 * local development keeps working unchanged.
 */
import { env } from '../config/env';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

export interface HttpMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface HttpMailResult {
  sent: boolean;
  error?: string;
}

/** Split "Assistify <no-reply@x.com>" into its parts; tolerate a bare address. */
function parseFrom(value: string): { name: string; email: string } {
  const match = value.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (match) return { name: match[1] || 'Assistify', email: match[2] };
  return { name: 'Assistify', email: value.trim() };
}

export function isHttpMailConfigured(): boolean {
  return Boolean(env.BREVO_API_KEY);
}

export async function sendMailOverHttp(input: HttpMailInput): Promise<HttpMailResult> {
  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) return { sent: false, error: 'BREVO_API_KEY is not set' };

  const sender = parseFrom(env.MAIL_FROM);

  // Bound it like the SMTP path: a hung provider must not hold the invite
  // request open, since the account already exists and the link is returned.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender,
        to: [{ email: input.to }],
        subject: input.subject,
        htmlContent: input.html,
        textContent: input.text,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      // Brevo returns { code, message }. Surface it — "sender not verified" and
      // "invalid key" need different fixes and are indistinguishable otherwise.
      let detail = `HTTP ${res.status}`;
      try {
        const body = (await res.json()) as { message?: string; code?: string };
        if (body?.message) detail = `${body.code ?? res.status}: ${body.message}`;
      } catch {
        /* non-JSON error body — the status alone will have to do */
      }
      // eslint-disable-next-line no-console
      console.error(`✉️  Brevo rejected mail to ${input.to}: ${detail}`);
      return { sent: false, error: detail };
    }

    // eslint-disable-next-line no-console
    console.log(`✉️  Email sent to ${input.to} via Brevo (HTTPS)`);
    return { sent: true };
  } catch (err) {
    const error =
      err instanceof Error && err.name === 'AbortError'
        ? 'Mail provider timed out'
        : err instanceof Error
          ? err.message
          : String(err);
    // eslint-disable-next-line no-console
    console.error(`✉️  Email to ${input.to} FAILED (HTTPS): ${error}`);
    return { sent: false, error };
  } finally {
    clearTimeout(timer);
  }
}
