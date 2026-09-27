import 'server-only';
import nodemailer from 'nodemailer';

/**
 * Transactional email over plain SMTP (nodemailer), so any provider works —
 * Resend, Brevo, SES, or a Gmail app password — by filling in the SMTP_* env
 * vars. When SMTP is not configured the send is skipped: in development the
 * verification link is printed to the server console instead, so the flow is
 * fully testable without a mail account.
 */

/**
 * Outcome of a verification send. Deliberately a returned value rather than a
 * thrown error: both callers (register, resend) need to keep going — the
 * account already exists — but must also be able to tell the user the truth
 * instead of "check your email" when nothing left the building.
 *
 * `not_configured` — no SMTP_HOST; nothing was attempted.
 * `send_failed`    — the provider refused or the connection broke. The cause is
 *                    almost always an unverified sender domain or bad creds,
 *                    i.e. global, not specific to this recipient.
 */
export type VerificationEmailResult =
  | { delivered: true }
  | { delivered: false; reason: 'not_configured' | 'send_failed' };

/**
 * Whether a result should be surfaced to the user as a failure.
 *
 * An unconfigured SMTP in development is the documented zero-setup path — the
 * verification link is printed to the dev console instead — so it is not a
 * failure there. In production it is, and so is any refused send.
 */
export function isDeliveryFailure(result: VerificationEmailResult): boolean {
  if (result.delivered) return false;
  if (result.reason === 'not_configured') {
    return process.env.NODE_ENV === 'production';
  }
  return true;
}

/**
 * Escape text that gets interpolated into the HTML body. `name` is supplied by
 * whoever called /api/auth/register — which is unauthenticated, unrated-limited,
 * and accepts ANY recipient address. Without this, an attacker registers a
 * victim's address with markup as the name and our domain delivers their HTML,
 * DKIM-signed as us. Escaping is what stops the domain becoming a phishing relay.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

function transport() {
  const port = Number(process.env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

function fromAddress(): string {
  return (
    process.env.EMAIL_FROM ||
    `Saakie by KNK <${process.env.SMTP_USER || 'no-reply@localhost'}>`
  );
}

/**
 * Send the signup confirmation link. Never throws — the caller gets a
 * `VerificationEmailResult` and decides what to tell the user. Failures are
 * logged with the provider's own response text, because that response ("550
 * the <domain> domain is not verified") is what actually identifies the fault.
 */
export async function sendVerificationEmail({
  to,
  name,
  verifyUrl,
}: {
  to: string;
  name?: string | null;
  verifyUrl: string;
}): Promise<VerificationEmailResult> {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[email] SMTP_HOST is not set — verification email NOT sent to',
        to
      );
    } else {
      console.warn(
        `[email] SMTP not configured — verification link for ${to}:\n  ${verifyUrl}`
      );
    }
    return { delivered: false, reason: 'not_configured' };
  }

  // Cap before use: a name is a name, and an unbounded string here is just an
  // amplification vector on an endpoint anyone can call.
  const safeName = name ? name.slice(0, 100) : null;
  const greetingText = safeName ? `Hi ${safeName},` : 'Hi,';
  const greetingHtml = safeName ? `Hi ${escapeHtml(safeName)},` : 'Hi,';

  try {
    await transport().sendMail({
      from: fromAddress(),
      to,
      subject: 'Confirm your email — Saakie by KNK',
      text: [
        greetingText,
        '',
        'Welcome to Saakie by KNK. Confirm your email address to activate your account:',
        '',
        verifyUrl,
        '',
        'The link is valid for 24 hours. If you did not create this account, you can ignore this email.',
      ].join('\n'),
      html: `
      <div style="margin:0 auto;max-width:520px;padding:32px 24px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
        <h1 style="margin:0 0 4px;font-size:22px;color:#111827;">Saakie <span style="color:#e11d48;">by KNK</span></h1>
        <p style="margin:24px 0 0;font-size:15px;line-height:1.6;">${greetingHtml}</p>
        <p style="margin:12px 0 0;font-size:15px;line-height:1.6;">
          Welcome to Saakie by KNK. Confirm your email address to activate your
          account.
        </p>
        <p style="margin:28px 0;">
          <a href="${verifyUrl}"
             style="display:inline-block;padding:12px 28px;border-radius:10px;background:#e11d48;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">
            Confirm email
          </a>
        </p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
          Or paste this link into your browser:<br />
          <a href="${verifyUrl}" style="color:#e11d48;word-break:break-all;">${verifyUrl}</a>
        </p>
        <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
          The link is valid for 24 hours. If you did not create this account,
          you can ignore this email.
        </p>
      </div>
    `,
    });
    return { delivered: true };
  } catch (error) {
    const response =
      (error as { response?: string })?.response ||
      (error instanceof Error ? error.message : String(error));
    console.error(
      `[email] verification email REJECTED for ${to} (from: ${fromAddress()}): ${response}`
    );
    return { delivered: false, reason: 'send_failed' };
  }
}
