import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

/**
 * Outbound email.
 *
 * Two transports behind one function:
 *
 *   SMTP_HOST set  → real delivery (Gmail, or any SMTP host).
 *   SMTP_HOST unset → Ethereal, a throwaway inbox that accepts everything and
 *                     hands back a preview URL. Nothing reaches a real person,
 *                     and a teammate who has just cloned the repo can still run
 *                     invite → activate end to end.
 *
 * Sending must never take the request down with it. If the mail server is
 * unreachable, the invited user still exists and HR still gets the activation
 * link back in the response — so `sendMail` reports failure instead of throwing.
 */

export interface MailResult {
  sent: boolean;
  /** Ethereal only — an https URL where the rendered email can be read. */
  previewUrl?: string;
  error?: string;
}

let transporter: Transporter | null = null;
let usingEthereal = false;

/** Give up quickly rather than hold an HTTP request open on a dead mail path. */
const TIMEOUTS = {
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 12000,
} as const;

/** Reject after `ms` so a hung promise cannot hold the request open. */
async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, guard]);
  } finally {
    clearTimeout(timer!);
  }
}

async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter;

  if (env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      // 465 is implicit TLS; 587 upgrades with STARTTLS.
      secure: (env.SMTP_PORT ?? 587) === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      // Without these, a host that silently drops SMTP traffic — as several
      // PaaS providers do to deter spam — leaves the socket open until Node's
      // default timeout. The invite request is awaiting this, so the caller
      // sees a button stuck on "Creating…" for minutes. Fail in seconds
      // instead: the user is already created and the copy-link fallback works.
      ...TIMEOUTS,
    });
    return transporter;
  }

  // createTestAccount() is a network call. If it hangs, so does the invite —
  // so bound it too, and let the caller fall back to the copy-link.
  const testAccount = await withTimeout(
    nodemailer.createTestAccount(),
    8000,
    'Ethereal account creation timed out',
  );
  usingEthereal = true;
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
    ...TIMEOUTS,
  });
  return transporter;
}

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendMail(input: MailInput): Promise<MailResult> {
  try {
    const tx = await getTransporter();
    // Belt and braces: the transport timeouts cover the socket, this covers the
    // whole send. Either way the request returns in seconds, not minutes.
    // 25s, not 15s: Gmail's first send on a cold transporter has been measured
    // at 11.5s here — TLS handshake plus auth — and the transporter is cached
    // afterwards, so later sends are much faster. The ceiling exists to bound
    // the worst case, not to be hit in normal use.
    const info = await withTimeout(
      tx.sendMail({ from: env.MAIL_FROM, ...input }),
      25000,
      'Mail send timed out',
    );

    const previewUrl = usingEthereal
      ? (nodemailer.getTestMessageUrl(info) as string | false) || undefined
      : undefined;

    /* eslint-disable no-console */
    if (previewUrl) {
      console.log(`✉️  Invitation email (Ethereal, not delivered to a real inbox)`);
      console.log(`    To      : ${input.to}`);
      console.log(`    Preview : ${previewUrl}`);
    } else {
      console.log(`✉️  Email sent to ${input.to}`);
    }
    /* eslint-enable no-console */

    return { sent: true, previewUrl };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(`✉️  Email to ${input.to} FAILED: ${error}`);
    return { sent: false, error };
  }
}

/** True when mail is going to a real SMTP host rather than the Ethereal sandbox. */
export function isRealMailConfigured(): boolean {
  return Boolean(env.SMTP_HOST);
}
