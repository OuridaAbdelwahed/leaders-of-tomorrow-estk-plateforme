import nodemailer from 'nodemailer';

type Mail = { to: string; subject: string; text: string; html?: string };

const enabled = (value: string | undefined) => ['1', 'true', 'yes', 'on'].includes(value?.trim().toLowerCase() ?? '');

function smtpSettings() {
  const host = process.env.MAIL_SERVER?.trim();
  const username = process.env.MAIL_USERNAME?.trim();
  const password = process.env.MAIL_PASSWORD;
  const from = process.env.MAIL_FROM?.trim();
  const port = Number(process.env.MAIL_PORT || 587);
  if (!host || !username || !password || !from || !Number.isInteger(port) || port < 1 || port > 65535) return;
  const secure = port === 465;
  return { host, port, secure, requireTLS: enabled(process.env.MAIL_TLS) && !secure, username, password, from };
}

export async function sendMail(mail: Mail) {
  if (mail.to.toLowerCase().endsWith('@leaders.local')) {
    return { delivered: false, development: false, skipped: true };
  }

  const settings = smtpSettings();
  if (!settings) {
    console.info('[mail:not-configured]', { to: mail.to, subject: mail.subject });
    return { delivered: false, development: true, skipped: false };
  }

  const transport = nodemailer.createTransport({
    pool: true,
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    requireTLS: settings.requireTLS,
    auth: { user: settings.username, pass: settings.password },
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  try {
    await transport.sendMail({ from: settings.from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
    return { delivered: true, development: false, skipped: false };
  } finally {
    transport.close();
  }
}
