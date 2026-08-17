import 'server-only';
import nodemailer from 'nodemailer';

/**
 * Transactional email over plain SMTP (nodemailer), so any provider works —
 * Resend, Brevo, SES, or a Gmail app password — by filling in the SMTP_* env
 * vars. When SMTP is not configured the send is skipped: in development the
 * verification link is printed to the server console instead, so the flow is
 * fully testable without a mail account.
 */

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
 * Send the signup confirmation link. Never throws on a missing SMTP config
 * (dev fallback logs the link); transport failures DO throw so callers can
 * decide how loudly to react.
 */
export async function sendVerificationEmail({
  to,
  name,
  verifyUrl,
}: {
  to: string;
  name?: string | null;
  verifyUrl: string;
}): Promise<void> {
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
    return;
  }

  const greeting = name ? `Hi ${name},` : 'Hi,';

  await transport().sendMail({
    from: fromAddress(),
    to,
    subject: 'Confirm your email — Saakie by KNK',
    text: [
      greeting,
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
        <p style="margin:24px 0 0;font-size:15px;line-height:1.6;">${greeting}</p>
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
}
