import type { EventRecord, MemberApplication } from '@/lib/types';

type MailTemplate = { subject: string; text: string; html: string };

type Detail = { label: string; value: string };

type BrandedMail = {
  subject: string;
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  details?: Detail[];
  action?: { label: string; href: string };
  note?: string;
  signature?: string;
};

const fallbackSiteUrl = 'https://leadersoftomorrowestk.com';

const siteUrl = () => {
  const value = process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || process.env.SITE_URL || fallbackSiteUrl;
  return value.replace(/\/$/, '');
};

const absoluteUrl = (path: string) => `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const textLines = (message: BrandedMail) => [
  message.title,
  '',
  message.intro,
  '',
  ...(message.details?.flatMap(detail => [`${detail.label}: ${detail.value}`]) ?? []),
  message.details?.length ? '' : undefined,
  message.action ? `${message.action.label}: ${message.action.href}` : undefined,
  message.note ? '' : undefined,
  message.note,
  '',
  message.signature ?? 'Leaders of Tomorrow ESTK',
].filter((line): line is string => line !== undefined).join('\n');

function brandedMail(message: BrandedMail): MailTemplate {
  const logo = absoluteUrl('/brand/logo-white.png');
  const details = message.details?.map(detail => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid rgba(50,109,123,.16);font:700 12px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#326d7b;">${escapeHtml(detail.label)}</td>
      <td style="padding:12px 0;border-bottom:1px solid rgba(50,109,123,.16);font:700 15px Arial,sans-serif;color:#13272c;text-align:right;">${escapeHtml(detail.value)}</td>
    </tr>
  `).join('');

  const action = message.action ? `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 0;">
      <tr>
        <td style="border-radius:22px 22px 7px 22px;background:#f5bc23;box-shadow:0 12px 28px rgba(8,36,42,.18),6px 6px 0 rgba(21,199,201,.16);">
          <a href="${escapeHtml(message.action.href)}" style="display:inline-block;padding:15px 24px;font:800 15px Arial,sans-serif;color:#10242a;text-decoration:none;">${escapeHtml(message.action.label)}</a>
        </td>
      </tr>
    </table>
  ` : '';

  const note = message.note ? `
    <div style="margin-top:24px;padding:16px 18px;border:1px solid rgba(50,109,123,.14);border-radius:18px 18px 6px 18px;background:#f4faf9;color:#50666c;font:500 14px/1.7 Arial,sans-serif;">
      ${escapeHtml(message.note)}
    </div>
  ` : '';

  return {
    subject: message.subject,
    text: textLines(message),
    html: `<!doctype html>
<html>
  <head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head>
  <body style="margin:0;padding:0;background:#07191e;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(message.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#07191e;padding:28px 12px;font-family:Arial,sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;overflow:hidden;border-radius:32px 32px 10px 32px;background:#ffffff;box-shadow:0 30px 90px rgba(0,0,0,.28);">
            <tr>
              <td style="position:relative;padding:28px 30px 46px;background:#08242a;background-image:linear-gradient(135deg,#07191e,#0b3a43 62%,#155e68);color:#ffffff;">
                <img src="${escapeHtml(logo)}" width="178" alt="Leaders of Tomorrow" style="display:block;height:auto;max-width:178px;border:0;">
                <div style="margin-top:34px;width:72px;height:4px;border-radius:99px;background:#f5bc23;"></div>
                <div style="margin-top:18px;font:800 11px Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#63c9c5;">${escapeHtml(message.eyebrow)}</div>
                <h1 style="margin:12px 0 0;font:800 34px/1.08 Arial,sans-serif;color:#ffffff;letter-spacing:0;">${escapeHtml(message.title)}</h1>
                <div style="width:112px;height:112px;border-radius:38% 62% 54% 46% / 54% 43% 57% 46%;background:rgba(245,188,35,.16);border:1px solid rgba(245,188,35,.38);position:absolute;right:-36px;bottom:-34px;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 30px 30px;background:#ffffff;">
                <p style="margin:0;font:500 16px/1.75 Arial,sans-serif;color:#50666c;">${escapeHtml(message.intro)}</p>
                ${details ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-collapse:collapse;">${details}</table>` : ''}
                ${action}
                ${note}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px;background:#f6f8f8;border-top:1px solid rgba(50,109,123,.12);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font:800 13px Arial,sans-serif;color:#326d7b;">Leaders of Tomorrow ESTK</td>
                    <td align="right" style="font:600 12px Arial,sans-serif;color:#70858b;">Khenifra, Morocco</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

export function applicationReceivedMail(application: MemberApplication): MailTemplate {
  return brandedMail({
    subject: `Application ${application.reference} received`,
    preheader: 'Your Leaders of Tomorrow membership application is now under review.',
    eyebrow: 'Membership application',
    title: 'Your application is in.',
    intro: 'Thank you for applying to Leaders of Tomorrow. The team will review your information and send the next update to this email address.',
    details: [
      { label: 'Reference', value: application.reference },
      { label: 'Applicant', value: application.fullName },
      { label: 'Program', value: application.program },
      { label: 'Contribution', value: `${application.contribution} MAD` },
    ],
    note: 'Keep your reference number. It helps us find your application quickly if you contact the club.',
  });
}

export function memberAccountMail(name: string, password: string): MailTemplate {
  return brandedMail({
    subject: 'Your Leaders of Tomorrow member account',
    preheader: 'Your member account is ready with an initial password.',
    eyebrow: 'Member access',
    title: 'Welcome to your member space.',
    intro: `Hello ${name}, your Leaders of Tomorrow account is ready. Use the initial password below to sign in.`,
    details: [
      { label: 'Email', value: 'Use the email that received this message' },
      { label: 'Initial password', value: password },
    ],
    action: { label: 'Open member space', href: absoluteUrl('/en/member') },
    note: 'For your security, sign in and replace this initial password as soon as possible.',
  });
}

export function memberCredentialMail(name: string, password: string): MailTemplate {
  return brandedMail({
    subject: 'Your Leaders of Tomorrow member access',
    preheader: 'A new initial password was generated for your member account.',
    eyebrow: 'Secure access',
    title: 'Your access has been refreshed.',
    intro: `Hello ${name}, an administrator generated a new initial password for your Leaders of Tomorrow account.`,
    details: [{ label: 'Initial password', value: password }],
    action: { label: 'Sign in to member space', href: absoluteUrl('/en/member') },
    note: 'Please sign in and replace this password with a private password.',
  });
}

export function ticketVerificationCodeMail(input: { eventTitle: string; code: string; expiresMinutes: number; locale?: 'en' | 'ar' }): MailTemplate {
  const ar = input.locale === 'ar';
  const subject = ar ? `رمز تأكيد تذكرتك: ${input.code}` : `Your ticket verification code: ${input.code}`;
  const intro = ar
    ? `استعمل هذا الرمز لتأكيد بريدك الإلكتروني وحجز تذكرتك لفعالية ${input.eventTitle}.`
    : `Use this code to verify your email and reserve your ticket for ${input.eventTitle}.`;
  return brandedMail({
    subject,
    preheader: ar ? 'رمز تأكيد قصير المدة لحجز التذكرة.' : 'A short-lived verification code for your ticket reservation.',
    eyebrow: ar ? 'تأكيد التذكرة' : 'Ticket verification',
    title: ar ? 'أكد بريدك الإلكتروني.' : 'Verify your email.',
    intro,
    details: [
      { label: ar ? 'رمز التأكيد' : 'Verification code', value: input.code },
      { label: ar ? 'الفعالية' : 'Event', value: input.eventTitle },
      { label: ar ? 'ينتهي خلال' : 'Expires in', value: `${input.expiresMinutes} min` },
    ],
    note: ar
      ? 'لا تشارك هذا الرمز مع أي شخص. إذا لم تطلب تذكرة، يمكنك تجاهل هذه الرسالة.'
      : 'Do not share this code. If you did not request a ticket, you can safely ignore this email.',
  });
}

export function donationConfirmationMail(input: { amount: number; currency: string; reference: string; date: string }): MailTemplate {
  const date = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(input.date));
  return brandedMail({
    subject: 'Donation confirmation',
    preheader: 'Thank you for supporting Leaders of Tomorrow.',
    eyebrow: 'Optional donation',
    title: 'Thank you for your support!',
    intro: `We confirm that we received your donation of ${input.amount.toFixed(2)} ${input.currency}. Your contribution helps the club grow and organize more activities, events, and initiatives for our members.`,
    details: [
      { label: 'Donation reference', value: input.reference },
      { label: 'Amount', value: `${input.amount.toFixed(2)} ${input.currency}` },
      { label: 'Date', value: date },
    ],
    note: 'This message is a donation confirmation. It is not a tax receipt.',
  });
}

export function invitationMail(memberName: string, event: EventRecord): MailTemplate {
  const startsAt = new Date(event.startsAt);
  return brandedMail({
    subject: `Invitation: ${event.title.en}`,
    preheader: `You are invited to represent Leaders of Tomorrow at ${event.title.en}.`,
    eyebrow: 'Event representation',
    title: 'You have a new invitation.',
    intro: `Hello ${memberName}, you are invited to participate as a Leaders of Tomorrow representative. Please open your member space to confirm or decline.`,
    details: [
      { label: 'Event', value: event.title.en },
      { label: 'Date', value: new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(startsAt) },
      { label: 'Location', value: event.location.en },
    ],
    action: { label: 'Respond to invitation', href: absoluteUrl('/en/member') },
    note: 'If you cannot attend, decline with a reason so the team can offer the place to another active member.',
  });
}
