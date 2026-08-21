import type { MailInput } from '../../shared/mailer';

/**
 * The password-reset email.
 *
 * Same inline-table construction as the invitation email, for the same reason:
 * Gmail strips <style> blocks and Outlook ignores flexbox, so anything clever
 * arrives broken. The plain-text alternative is not a formality — some clients
 * show it, and a missing one counts against you with spam filters.
 */
export interface ResetEmailInput {
  fullName: string;
  companyName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function buildPasswordResetEmail(input: ResetEmailInput): Omit<MailInput, 'to'> {
  const { fullName, companyName, resetUrl, expiresInMinutes } = input;

  const text = [
    `Hello ${fullName},`,
    '',
    `Someone asked to reset the password for your ${companyName} account on Assistify.`,
    '',
    'Open this link to choose a new one:',
    resetUrl,
    '',
    `The link works once and expires in ${expiresInMinutes} minutes.`,
    '',
    'If this was not you, ignore this email — your password has not changed, and',
    'nobody can use this link without access to your inbox.',
  ].join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f7;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:10px;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:28px 32px 8px 32px;">
                <p style="margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#4338ca;font-weight:700;">Assistify</p>
                <h1 style="margin:12px 0 0 0;font-size:21px;color:#18181b;font-weight:600;">Reset your password</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 0 32px;font-size:15px;line-height:1.6;color:#3f3f46;">
                <p style="margin:0 0 14px 0;">Hello ${escapeHtml(fullName)},</p>
                <p style="margin:0 0 14px 0;">
                  Someone asked to reset the password for your
                  <strong>${escapeHtml(companyName)}</strong> account.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 32px;">
                <a href="${resetUrl}"
                   style="display:inline-block;background:#4338ca;color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:8px;font-size:15px;font-weight:600;">
                  Choose a new password
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px 32px;font-size:13px;line-height:1.6;color:#71717a;">
                <p style="margin:0 0 12px 0;">
                  The link works once and expires in ${expiresInMinutes} minutes.
                </p>
                <p style="margin:0 0 12px 0;">
                  If the button does not work, copy this into your browser:<br>
                  <span style="word-break:break-all;color:#4338ca;">${resetUrl}</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 28px 32px;">
                <div style="border-top:1px solid #e4e4e7;padding-top:14px;font-size:13px;line-height:1.6;color:#71717a;">
                  <strong style="color:#3f3f46;">Did not ask for this?</strong>
                  Ignore this email. Your password has not changed, and the link is
                  useless to anyone without access to your inbox.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: `Reset your Assistify password`, text, html };
}

/** The name comes from the database, but it is still user-supplied text. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
