import { NextResponse } from 'next/server';
import { requireAdminPermission } from '@/server/adminAuth';
import { createInvoicePdf } from '@/server/sponsorshipDocuments';
import { getAdminInvoice } from '@/server/sponsorshipRepository';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const auth=await requireAdminPermission('sponsorship.finance');if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});const {id}=await params;const invoice=await getAdminInvoice(id);if(!invoice)return NextResponse.json({error:'Invoice not found.'},{status:404});const pdf=createInvoicePdf(invoice);return new NextResponse(new Uint8Array(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${invoice.invoiceNumber.replace(/[^a-z0-9-]+/gi,'-')}.pdf"`,'Cache-Control':'private, no-store'}});}
