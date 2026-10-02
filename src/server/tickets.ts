import QRCode from 'qrcode';
import type { EventRecord, EventRegistration, TicketStatus } from '@/lib/types';
import { createToken } from './security';

const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function shortCode(length = 10) {
  const token = createToken().toUpperCase();
  let output = '';
  for (let index = 0; output.length < length && index < token.length; index += 2) {
    output += codeAlphabet[Number.parseInt(token.slice(index, index + 2), 16) % codeAlphabet.length];
  }
  return output.padEnd(length, 'X');
}

export function createTicketCode(event: EventRecord) {
  return `LOT-${event.slug.slice(0, 4).toUpperCase()}-${shortCode(10)}`;
}

export function ticketPayload(code: string, token: string) {
  return `LOT-TICKET:v1:${code}:${token}`;
}

export function parseTicketPayload(value: string) {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get('code') || url.searchParams.get('ticket');
    const token = url.searchParams.get('token');
    if (code && token) return { code, token };
  } catch { /* The QR may use the compact LOT-TICKET format. */ }
  if (trimmed.startsWith('LOT-TICKET:')) {
    const parts = trimmed.split(':');
    const [code, token] = parts[1] === 'v1' ? [parts[2], parts[3]] : [parts[1], parts[2]];
    return code && token ? { code, token } : undefined;
  }
  const parts = trimmed.split(/\s+/);
  return parts.length === 2 ? { code: parts[0], token: parts[1] } : { code: trimmed, token: '' };
}

export async function createTicketQrDataUrl(code: string, token: string) {
  return QRCode.toDataURL(ticketPayload(code, token), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 440,
    color: { dark: '#062E36', light: '#FFFFFF' },
  });
}

export function publicTicket(registration: EventRegistration, event: EventRecord, locale: string) {
  return {
    code: registration.ticketCode,
    status: registration.ticketStatus as TicketStatus,
    waitlistPosition: registration.waitlistPosition,
    qrDataUrl: registration.ticketQrDataUrl,
    ticketUrl: `/${locale}/tickets/${registration.ticketCode}?token=${encodeURIComponent(registration.ticketToken ?? '')}`,
    participant: {
      fullName: registration.fullName,
      email: registration.email,
      phone: registration.phone,
      studentId: registration.studentId,
      programCode: registration.programCode,
    },
    event: {
      title: event.title,
      location: event.location,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      coverPath: event.coverPath,
      category: event.category,
    },
  };
}
