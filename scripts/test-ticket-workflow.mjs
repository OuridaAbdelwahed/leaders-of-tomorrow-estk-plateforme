import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import { databaseConfig, loadLocalEnv } from './env.mjs';

loadLocalEnv();
const baseUrl = process.env.WORKFLOW_BASE_URL || 'http://127.0.0.1:4173';
const suffix = randomBytes(5).toString('hex');
const slug = `workflow-${suffix}`;
const connection = await mysql.createConnection(databaseConfig());
let eventId; let ticketTypeId; let ticketId;

async function json(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { throw new Error(`${options.method || 'GET'} ${path} returned ${response.status} without JSON: ${text.slice(0, 160)}`); }
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${body.error || body.message || response.status}`);
  return { response, body };
}

try {
  const loginResponse = await fetch(`${baseUrl}/api/admin/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ portal: process.env.ADMIN_PORTAL_SLUG, email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }) });
  if (!loginResponse.ok) throw new Error(`Admin login failed: ${loginResponse.status}`);
  const cookie = loginResponse.headers.get('set-cookie')?.split(';')[0];
  if (!cookie) throw new Error('Admin session cookie was not returned.');
  const authHeaders = { 'content-type': 'application/json', cookie };
  const start = new Date(Date.now() - 60_000).toISOString();
  const end = new Date(Date.now() + 3_600_000).toISOString();
  ({ body: { id: eventId } } = await json('/api/admin/resources/events', { method: 'POST', headers: authHeaders, body: JSON.stringify({ slug, title: { en: 'Temporary workflow verification', ar: 'اختبار مؤقت' }, summary: { en: 'Automatically removed after verification.', ar: 'يتم حذفه بعد الاختبار.' }, location: { en: 'Local test venue', ar: 'مكان اختبار محلي' }, startsAt: start, endsAt: end, deadlineAt: end, capacity: 10, registered: 0, status: 'PUBLISHED', category: 'Verification' }) }));
  ({ body: { id: ticketTypeId } } = await json('/api/admin/resources/ticket-types', { method: 'POST', headers: authHeaders, body: JSON.stringify({ eventId, name: { en: 'General', ar: 'عامة' }, description: { en: 'Workflow verification', ar: 'اختبار' }, price: 0, quantity: 10, validFrom: start, validUntil: end, status: 'ACTIVE' }) }));
  const registration = await json(`/api/public/events/${slug}/registrations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fullName: 'Workflow Participant', email: `workflow-${suffix}@example.test`, phone: `+2126${suffix.slice(0,8)}`, studentId: `WF-${suffix}`, programCode: 'TEST', ticketTypeId, locale: 'en' }) });
  ticketId = registration.body.ticket.id;
  const token = new URL(registration.body.ticket.ticketUrl, baseUrl).searchParams.get('token');
  const download = await fetch(`${baseUrl}/api/tickets/${registration.body.ticket.code}/download?token=${encodeURIComponent(token)}&locale=en`);
  const downloadBytes = new Uint8Array(await download.arrayBuffer());
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!download.ok || !download.headers.get('content-disposition')?.startsWith('attachment') || !download.headers.get('content-type')?.includes('image/png') || !pngSignature.every((byte, index) => downloadBytes[index] === byte)) throw new Error('Direct ticket download did not return a valid PNG attachment.');
  const payload = registration.body.qrPayload;
  const accepted = await json(`/api/events/${eventId}/scan`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ payload }) });
  if (accepted.body.result !== 'valid') throw new Error(`First scan was not valid: ${accepted.body.result}`);
  await new Promise(resolve => setTimeout(resolve, 1700));
  const secondResponse = await fetch(`${baseUrl}/api/events/${eventId}/scan`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ payload }) });
  const second = await secondResponse.json();
  if (second.result !== 'already_used') throw new Error(`Second scan was not already_used: ${second.result}`);
  const logs = await json(`/api/events/${eventId}/scan-logs?page=1&pageSize=25`, { headers: { cookie } });
  if (logs.body.items.length !== 2 || !logs.body.items.some(item => item.scanResult === 'valid') || !logs.body.items.some(item => item.scanResult === 'already_used')) throw new Error('Successful and rejected scan logs were not both saved.');
  const summary = await json(`/api/events/${eventId}/scan-summary`, { headers: { cookie } });
  if (summary.body.summary.uniqueValidatedTickets !== 1 || summary.body.summary.totalScans !== 2) throw new Error('Scan summary values are incorrect.');
  process.stdout.write('Ticket workflow passed: download, valid scan, used-ticket rejection, logs, and summary.\n');
} finally {
  try {
    await connection.beginTransaction();
    if (eventId) await connection.execute('DELETE FROM scan_logs WHERE event_id=?', [eventId]);
    if (ticketId) await connection.execute('DELETE FROM tickets WHERE id=?', [ticketId]);
    if (ticketTypeId) await connection.execute('DELETE FROM ticket_types WHERE id=?', [ticketTypeId]);
    if (eventId) await connection.execute('DELETE FROM event_images WHERE event_id=?', [eventId]);
    if (eventId) await connection.execute('DELETE FROM event_managers WHERE event_id=?', [eventId]);
    if (eventId) await connection.execute('DELETE FROM scanner_event_access WHERE event_id=?', [eventId]);
    if (eventId) await connection.execute('DELETE FROM event_invitations WHERE event_id=?', [eventId]);
    if (eventId) await connection.execute('DELETE FROM events WHERE id=?', [eventId]);
    await connection.execute("DELETE c FROM event_categories c LEFT JOIN events e ON e.category_id=c.id WHERE e.id IS NULL AND c.name_en='Verification'");
    await connection.execute("DELETE FROM audit_logs WHERE detail LIKE '%Temporary workflow verification%' OR resource_id IN (?,?)", [eventId || '', ticketTypeId || '']);
    await connection.commit();
  } catch (cleanupError) { await connection.rollback(); process.stderr.write(`Workflow cleanup failed: ${cleanupError.message}\n`); }
  await connection.end();
}
