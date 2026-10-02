import fs from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';
import sharp from 'sharp';
import type { TicketDetail } from './ticketingRepository';
import { ticketPayload } from './tickets';

const escapeXml = (value: unknown) => String(value ?? '').replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!);
const mimeFor = (file: string) => file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : file.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg';

async function embeddedCover(value?: string) {
  if (!value) return undefined;
  if (value.startsWith('data:image/')) return value;
  const publicRoot = path.resolve(process.cwd(), 'public');
  const target = path.resolve(publicRoot, value.replace(/^\/+/, ''));
  if (!target.startsWith(publicRoot)) return undefined;
  try {
    const file = await fs.readFile(target);
    return `data:${mimeFor(target)};base64,${file.toString('base64')}`;
  } catch { return undefined; }
}

export async function createTicketSvg(ticket: TicketDetail, token: string, locale: string) {
  const ar = locale === 'ar';
  const title = ar ? ticket.event.title.ar : ticket.event.title.en;
  const location = ar ? ticket.event.location.ar : ticket.event.location.en;
  const type = ar ? ticket.ticketTypeName.ar : ticket.ticketTypeName.en;
  const start = new Date(ticket.event.startsAt);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(start);
  const time = new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(start);
  const cover = await embeddedCover(ticket.event.coverPath);
  const qr = await QRCode.toDataURL(ticketPayload(ticket.code, token), { width: 420, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#062E36', light: '#FFFFFF' } });
  const coverTitleFit = title.length > 18 ? ' textLength="270" lengthAdjust="spacingAndGlyphs"' : '';
  const mainTitleFit = title.length > 30 ? ' textLength="420" lengthAdjust="spacingAndGlyphs"' : '';
  const status = ticket.status === 'ACTIVE' ? (ar ? 'صالح' : 'VALID') : ticket.status;
  const labels = ar
    ? { participant: 'المشارك', type: 'نوع التذكرة', number: 'رقم التذكرة', date: 'التاريخ والوقت', place: 'المكان' }
    : { participant: 'PARTICIPANT', type: 'TICKET TYPE', number: 'TICKET NUMBER', date: 'DATE & TIME', place: 'LOCATION' };
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="500" viewBox="0 0 1120 500" role="img" aria-label="${escapeXml(title)} ticket">
  <defs>
    <linearGradient id="ticket-bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#082D35"/><stop offset="1" stop-color="#0B5058"/></linearGradient>
    <linearGradient id="cover-shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#062E36" stop-opacity=".15"/><stop offset="1" stop-color="#062E36" stop-opacity=".9"/></linearGradient>
    <clipPath id="ticket-clip"><rect width="1120" height="500" rx="28"/></clipPath>
  </defs>
  <g clip-path="url(#ticket-clip)">
    <rect width="1120" height="500" fill="#F8FBFB"/>
    <rect width="330" height="500" fill="url(#ticket-bg)"/>
    ${cover ? `<image href="${escapeXml(cover)}" width="330" height="500" preserveAspectRatio="xMidYMid slice"/><rect width="330" height="500" fill="url(#cover-shade)"/>` : ''}
    <text x="28" y="42" fill="#FFFFFF" font-family="Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="2">NEW LEADERS OF TOMORROW</text>
    <text x="28" y="365" fill="#FFFFFF" font-family="Arial,sans-serif" font-size="30" font-weight="800"${coverTitleFit}>${escapeXml(title)}</text>
    <text x="28" y="402" fill="#E7B64A" font-family="Arial,sans-serif" font-size="16" font-weight="700">${escapeXml(ticket.event.category)}</text>
    <rect x="28" y="432" width="96" height="34" rx="17" fill="#FFFFFF" fill-opacity=".14" stroke="#FFFFFF" stroke-opacity=".35"/>
    <text x="76" y="454" text-anchor="middle" fill="#FFFFFF" font-family="Arial,sans-serif" font-size="13" font-weight="800">${escapeXml(status)}</text>

    <line x1="330" y1="24" x2="330" y2="476" stroke="#B9C9CC" stroke-width="2" stroke-dasharray="8 9"/>
    <circle cx="330" cy="0" r="15" fill="#FFFFFF"/><circle cx="330" cy="500" r="15" fill="#FFFFFF"/>

    <g font-family="Arial,sans-serif" direction="${ar ? 'rtl' : 'ltr'}">
      <text x="370" y="58" fill="#0A3F47" font-size="25" font-weight="800"${mainTitleFit}>${escapeXml(title)}</text>
      <rect x="370" y="79" width="420" height="3" rx="2" fill="#E7B64A"/>
      <text x="370" y="124" fill="#6A7C80" font-size="12" font-weight="700" letter-spacing="1.5">${escapeXml(labels.date)}</text>
      <text x="370" y="151" fill="#102D33" font-size="18" font-weight="700">${escapeXml(date)} · ${escapeXml(time)}</text>
      <text x="370" y="196" fill="#6A7C80" font-size="12" font-weight="700" letter-spacing="1.5">${escapeXml(labels.place)}</text>
      <text x="370" y="223" fill="#102D33" font-size="18" font-weight="700">${escapeXml(location)}</text>
      <text x="370" y="278" fill="#6A7C80" font-size="12" font-weight="700" letter-spacing="1.5">${escapeXml(labels.participant)}</text>
      <text x="370" y="308" fill="#102D33" font-size="23" font-weight="800">${escapeXml(ticket.participantName)}</text>
      <text x="370" y="356" fill="#6A7C80" font-size="12" font-weight="700" letter-spacing="1.5">${escapeXml(labels.type)}</text>
      <text x="370" y="384" fill="#102D33" font-size="18" font-weight="700">${escapeXml(type)}</text>
      <text x="370" y="430" fill="#6A7C80" font-size="12" font-weight="700" letter-spacing="1.5">${escapeXml(labels.number)}</text>
      <text x="370" y="458" fill="#0A6670" font-family="Courier New,monospace" font-size="18" font-weight="800">${escapeXml(ticket.code)}</text>
    </g>

    <rect x="840" y="52" width="232" height="232" rx="18" fill="#FFFFFF" stroke="#DCE7E8" stroke-width="2"/>
    <image href="${escapeXml(qr)}" x="851" y="63" width="210" height="210"/>
    <text x="956" y="318" text-anchor="middle" fill="#607479" font-family="Arial,sans-serif" font-size="12">${ar ? 'امسح عند المدخل' : 'SCAN AT ENTRANCE'}</text>
    <text x="956" y="358" text-anchor="middle" fill="#0A3F47" font-family="Courier New,monospace" font-size="15" font-weight="800">${escapeXml(ticket.code)}</text>
    <path d="M870 406h172" stroke="#DCE7E8"/>
    <text x="956" y="438" text-anchor="middle" fill="#607479" font-family="Arial,sans-serif" font-size="12">${ar ? 'تذكرة شخصية غير قابلة للتحويل' : 'PERSONAL · NON-TRANSFERABLE'}</text>
  </g>
  <rect x="1" y="1" width="1118" height="498" rx="27" fill="none" stroke="#C8D6D8" stroke-width="2"/>
</svg>`;
}

export async function createTicketPng(ticket: TicketDetail, token: string, locale: string) {
  const svg = await createTicketSvg(ticket, token, locale);
  return sharp(Buffer.from(svg, 'utf8'))
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

export function ticketFilename(ticket: TicketDetail) {
  const slug = ticket.event.slug.replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const code = ticket.code.replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  return `ticket-${slug}-${code}.png`;
}
