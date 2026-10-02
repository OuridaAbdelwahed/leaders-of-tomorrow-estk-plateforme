import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isValidEducationSelection } from '@/lib/education';
import { submitApplication } from '@/server/store';
import { recordPolicyAcceptances } from '@/server/legalAcceptanceRepository';
import { RecruitmentUnavailableError } from '@/server/membershipRecruitmentRepository';
import { checkRateLimit, requestRateLimitKey } from '@/server/rateLimit';
import { validateMutationRequest } from '@/server/requestSecurity';

const schema = z.object({
  fullName: z.string().trim().min(3).max(120), email: z.email(), phone: z.string().min(8).max(30), city: z.string().min(2).max(80),
  institution: z.string().min(2).max(140), program: z.string().min(2).max(180), contribution: z.number().min(50).max(10000), motivation: z.string().min(20).max(700), consent: z.literal(true),
  locale: z.enum(['en','ar']).optional(),
  photoDataUrl: z.string().max(2_100_000).optional(), cvName: z.string().max(200).optional(),
}).refine(input => isValidEducationSelection(input.institution, input.program), { message: 'Choose a program offered by the selected institution.', path: ['program'] });

export async function POST(request: Request) {
  const trust = validateMutationRequest(request);
  if (!trust.ok) return NextResponse.json({ error: trust.reason }, { status: 403 });
  const rate = checkRateLimit(requestRateLimitKey(request, 'membership-application'), 5, 60 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: 'Too many application attempts. Please try again later.' }, { status: 429, headers: { 'retry-after': String(rate.retryAfter) } });
  try { const input = schema.parse(await request.json()); const application = await submitApplication(input); await recordPolicyAcceptances({subjectType:'membership_application',subjectId:application.id,policySlugs:['membership-agreement','internal-regulations','code-of-conduct','terms','privacy'],locale:input.locale??(request.headers.get('accept-language')?.startsWith('ar')?'ar':'en'),request}); return NextResponse.json({ id: application.id, reference: application.reference }, { status: 201 }); }
  catch (error) { if (error instanceof z.ZodError) return NextResponse.json({ error: 'Please review the highlighted application fields.', issues: error.issues }, { status: 400 }); if (error instanceof RecruitmentUnavailableError) return NextResponse.json({ error: error.message, code: error.code, availability: error.availability }, { status: 403 }); return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to submit application.' }, { status: 409 }); }
}
