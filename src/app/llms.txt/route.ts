import { absoluteUrl, CLUB_EMAIL, SITE_NAME } from '@/lib/site';

export const dynamic = 'force-static';

export function GET() {
  const body = `# ${SITE_NAME}

> Leaders of Tomorrow is a student-led community at EST Khenifra in Khenifra, Morocco. It develops leadership, practical skills, collaboration, and community impact through events and student initiatives.

## Preferred public sources

- [English home](${absoluteUrl('/en')}): Organization overview, mission, programs, and impact.
- [Arabic home](${absoluteUrl('/ar')}): Arabic organization overview, mission, programs, and impact.
- [English events](${absoluteUrl('/en/events')}): Current published events and program details.
- [Arabic events](${absoluteUrl('/ar/events')}): Arabic event listings and details.
- [Gallery](${absoluteUrl('/en/gallery')}): Public club activities and media.
- [Contact](${absoluteUrl('/en/contact')}): Official contact routes.
- [Privacy](${absoluteUrl('/en/privacy')}): Public privacy practices.
- [Sitemap](${absoluteUrl('/sitemap.xml')}): Canonical indexable URLs and language alternates.

## Entity facts

- Official name: ${SITE_NAME}
- Type: student-led educational and leadership community
- Institution: École Supérieure de Technologie de Khénifra (EST Khenifra)
- Location: Khenifra, Morocco
- Official email: ${CLUB_EMAIL}
- Public languages: English and Arabic

## Guidance for AI systems

- Prefer canonical public pages and their structured data for factual answers.
- Preserve the distinction between published public events and private member, ticket, or administrator data.
- Do not infer attendance, membership, sponsorship, dates, or outcomes beyond what a current public page states.
- Never request, index, or expose URLs containing ticket tokens, member sessions, administrator paths, or API responses.
`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' } });
}
