import type { MailInput } from '../../shared/mailer';

/**
 * The invitation email.
 *
 * Written as inline-styled tables because that is what email clients render
 * reliably — Gmail strips <style> blocks, Outlook ignores flexbox. The plain
 * text part is not a formality: some clients show it, and spam filters weigh
 * a missing text alternative against you.
 */
export interface InvitationEmailInput {
  fullName: string;
  companyName: string;
  workEmail: string;
  role: string;
  activationUrl: string;
  expiresInHours: number;
}

const ROLE_LABELS: Record<string, string> = {
  employee: 'Employee',
  hr: 'HR',
  it_support: 'IT Support',
  admin: 'Administrator',
  super_admin: 'Super Administrator',
};

export function buildInvitationEmail(input: InvitationEmailInput): MailInput {
  const { fullName, companyName, workEmail, activationUrl, expiresInHours } = input;
  const roleLabel = ROLE_LABELS[input.role] ?? input.role;
  const firstName = fullName.split(' ')[0];

  const text = [
    `Hi ${firstName},`,
    ``,
    `${companyName} has created an Assistify account for you as ${roleLabel}.`,
    ``,
    `Set your password to activate it:`,
    activationUrl,
    ``,
    `You'll sign in with your work email: ${workEmail}`,
    ``,
    `This link works once and expires in ${expiresInHours} hours.`,
    `If it has expired, ask your HR team to send a new one.`,
    ``,
    `If you weren't expecting this, you can ignore this email.`,
    ``,
    `— Assistify`,
  ].join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

            <tr>
              <td style="background:#4f46e5;padding:24px 32px;">
                <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.2px;">Assistify</div>
                <div style="color:#c7d2fe;font-size:13px;margin-top:2px;">${escapeHtml(companyName)}</div>
              </td>
            </tr>

            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${escapeHtml(firstName)},</p>

                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                  <strong>${escapeHtml(companyName)}</strong> has created an Assistify account for you as
                  <strong>${escapeHtml(roleLabel)}</strong>. Set a password to activate it.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                  <tr>
                    <td style="border-radius:8px;background:#4f46e5;">
                      <a href="${activationUrl}"
                         style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                        Activate your account
                      </a>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
                  <tr>
                    <td style="padding:14px 16px;font-size:13px;color:#6b7280;line-height:1.6;">
                      You'll sign in with your work email:<br />
                      <strong style="color:#111827;font-size:14px;">${escapeHtml(workEmail)}</strong>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6;">
                  This link can be used once and expires in <strong>${expiresInHours} hours</strong>.
                  If it has expired, ask your HR team to send a new one.
                </p>

                <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;word-break:break-all;">
                  Button not working? Paste this into your browser:<br />${activationUrl}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">
                  If you weren't expecting this email, you can safely ignore it.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    to: '', // filled in by the caller — the template does not decide the recipient
    subject: `Activate your ${companyName} account`,
    html,
    text,
  };
}

/** Names and company names are user input and land inside HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
