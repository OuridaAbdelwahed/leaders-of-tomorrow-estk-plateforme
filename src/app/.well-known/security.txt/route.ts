import { absoluteUrl, CLUB_EMAIL } from '@/lib/site';

export const dynamic = 'force-static';

export function GET() {
  const contact = process.env.SECURITY_CONTACT_EMAIL || CLUB_EMAIL;
  const expires = process.env.SECURITY_TXT_EXPIRES || '2027-07-28T00:00:00.000Z';
  const body = [
    `Contact: mailto:${contact}`,
    `Expires: ${expires}`,
    `Canonical: ${absoluteUrl('/.well-known/security.txt')}`,
    'Preferred-Languages: en, ar',
    'Policy: ' + absoluteUrl('/en/privacy'),
  ].join('\n') + '\n';
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
