import type { Invoice } from '@/features/sponsorship/types';

const pdfEscape=(value:string)=>value.replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)').replace(/[^\x20-\x7E]/g,'?');
export function createInvoicePdf(invoice:Invoice){
  const total=invoice.amount+invoice.taxAmount;const lines=[
    ['NEW LEADERS OF TOMORROW',20],['SPONSORSHIP INVOICE',17],[invoice.invoiceNumber,12],['',10],
    [`Bill to: ${invoice.sponsorName||invoice.sponsorId}`,12],[`Campaign: ${invoice.campaignName||'General partnership'}`,10],
    [`Issued: ${new Date(invoice.issuedAt).toLocaleDateString('en-CA')}`,10],[`Due: ${new Date(invoice.dueDate).toLocaleDateString('en-CA')}`,10],['',10],
    [`Subtotal: ${invoice.amount.toFixed(2)} ${invoice.currency}`,12],[`Tax: ${invoice.taxAmount.toFixed(2)} ${invoice.currency}`,12],
    [`Total: ${total.toFixed(2)} ${invoice.currency}`,15],[`Paid: ${invoice.paidAmount.toFixed(2)} ${invoice.currency}`,11],[`Outstanding: ${invoice.outstandingAmount.toFixed(2)} ${invoice.currency}`,13],
    ['',10],[`Status: ${invoice.paymentStatus.replaceAll('_',' ')}`,12],invoice.notes?[`Notes: ${invoice.notes}`,9]:undefined,
    ['',10],['Leaders of Tomorrow ESTK - Khenifra, Morocco',9],
  ].filter((line):line is [string,number]=>Boolean(line));
  let y=790;const commands=['0.04 0.20 0.23 rg'];for(const [text,size] of lines){if(!text){y-=12;continue;}commands.push(`BT /F1 ${size} Tf 54 ${y} Td (${pdfEscape(text).slice(0,110)}) Tj ET`);y-=size+10;}
  const stream=commands.join('\n');const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((object,index)=>{offsets[index+1]=Buffer.byteLength(pdf);pdf+=`${index+1} 0 obj\n${object}\nendobj\n`;});const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(value=>`${String(value).padStart(10,'0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf,'binary');
}
