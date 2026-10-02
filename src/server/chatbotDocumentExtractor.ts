import { createHash } from 'node:crypto';
import type { ChatLanguage } from '@/features/chatbot/types';

export const KNOWLEDGE_FILE_TYPES = ['PDF','WORD','IMAGE','WHATSAPP','INSTAGRAM','TIKTOK','CONVERSATION'] as const;
export type KnowledgeFileType = typeof KNOWLEDGE_FILE_TYPES[number];

export type ExtractedKnowledge = {
  text:string;
  checksum:string;
  method:'PDF_TEXT'|'DOCX_TEXT'|'OCR'|'PLAIN_TEXT'|'CONVERSATION_EXPORT';
  mimeType:string;
  byteSize:number;
  warnings:string[];
};

const MAX_FILE_BYTES = Math.max(1, Number(process.env.CHATBOT_TRAINING_MAX_FILE_MB || 15)) * 1024 * 1024;
const MAX_IMAGE_PIXELS = 25_000_000;

function cleanText(input:string) {
  return input
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function deidentifyConversation(input:string) {
  return cleanText(input)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email removed]')
    .replace(/(?:https?:\/\/|www\.)\S+/gi, '[link removed]')
    .replace(/(?<!\d)(?:\+?\d[\d .()\-]{7,}\d)(?!\d)/g, '[phone removed]')
    .replace(/^\s*\[[^\]\n]{1,60}\]\s*[^:\n]{1,80}:\s*/gm, '')
    .replace(/^\s*\d{1,4}[\/.-]\d{1,2}[\/.-]\d{1,4}[^\n]{0,40}(?:-|–)\s*[^:\n]{1,80}:\s*/gm, '')
    .replace(/\b(?:password|mot de passe|otp|secret|token)\s*[:=]\s*\S+/gi, '$1: [secret removed]');
}

function stringsFromJson(value:unknown, output:string[], key='') {
  if(output.length >= 50_000) return;
  if(typeof value === 'string') {
    if(!key || /message|text|content|caption|body|comment|title|description/i.test(key)) output.push(value);
    return;
  }
  if(Array.isArray(value)) { for(const item of value) stringsFromJson(item, output, key); return; }
  if(value && typeof value === 'object') for(const [childKey,child] of Object.entries(value)) stringsFromJson(child, output, childKey);
}

function parseTextExport(buffer:Buffer) {
  const raw=buffer.toString('utf8');
  try {
    const parsed=JSON.parse(raw) as unknown;const strings:string[]=[];stringsFromJson(parsed,strings);return strings.length?strings.join('\n'):raw;
  } catch { return raw; }
}

async function extractPdf(buffer:Buffer) {
  const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task=pdfjs.getDocument({data:new Uint8Array(buffer)});
  const document=await task.promise;const pages:string[]=[];
  try {
    for(let index=1;index<=document.numPages;index+=1){const page=await document.getPage(index);const content=await page.getTextContent();pages.push(content.items.map(item=>'str' in item?item.str:'').join(' '));page.cleanup();}
  } finally { await task.destroy(); }
  return pages.join('\n\n');
}

async function extractDocx(buffer:Buffer) {
  const mammoth=(await import('mammoth')).default;
  return (await mammoth.extractRawText({buffer})).value;
}

async function languagePack(language:ChatLanguage) {
  if(language==='ar') return (await import('@tesseract.js-data/ara')).default;
  if(language==='fr') return (await import('@tesseract.js-data/fra')).default;
  return (await import('@tesseract.js-data/eng')).default;
}

async function extractImage(buffer:Buffer,language:ChatLanguage) {
  const sharp=(await import('sharp')).default;const metadata=await sharp(buffer,{failOn:'error'}).metadata();
  if(!metadata.width||!metadata.height||metadata.width*metadata.height>MAX_IMAGE_PIXELS) throw new Error('The image is invalid or exceeds the 25 megapixel OCR limit.');
  if(!['jpeg','png','webp'].includes(metadata.format||'')) throw new Error('Only JPEG, PNG, and WebP images are accepted for OCR.');
  const [{createWorker},pack]=await Promise.all([import('tesseract.js'),languagePack(language)]);
  const worker=await createWorker(pack.code,1,{langPath:pack.langPath,gzip:pack.gzip,cacheMethod:'none'});
  try { return (await worker.recognize(buffer)).data.text; } finally { await worker.terminate(); }
}

export async function extractKnowledgeFile(file:File,sourceType:KnowledgeFileType,language:ChatLanguage):Promise<ExtractedKnowledge> {
  if(file.size<=0) throw new Error('The selected file is empty.');
  if(file.size>MAX_FILE_BYTES) throw new Error(`Files are limited to ${Math.round(MAX_FILE_BYTES/1024/1024)} MB.`);
  const buffer=Buffer.from(await file.arrayBuffer());const name=file.name.toLowerCase();const mime=(file.type||'application/octet-stream').toLowerCase();
  let text='';let method:ExtractedKnowledge['method']='PLAIN_TEXT';const warnings:string[]=[];
  if(sourceType==='PDF') {
    if(!buffer.subarray(0,5).toString('ascii').startsWith('%PDF-')) throw new Error('The file is not a valid PDF.');
    text=await extractPdf(buffer);method='PDF_TEXT';if(text.trim().length<30) warnings.push('Very little selectable text was found. Scanned PDF pages should be uploaded as images for OCR.');
  } else if(sourceType==='WORD') {
    if(!(name.endsWith('.docx')&&buffer[0]===0x50&&buffer[1]===0x4b)) throw new Error('Only modern .docx Word files are accepted; legacy .doc files are rejected.');
    text=await extractDocx(buffer);method='DOCX_TEXT';
  } else if(sourceType==='IMAGE') { text=await extractImage(buffer,language);method='OCR'; }
  else {
    if(!/\.(txt|csv|json|html?|md)$/i.test(name)&&!/^text\//.test(mime)&&mime!=='application/json') throw new Error('Conversation exports must be TXT, CSV, JSON, HTML, or Markdown files.');
    text=parseTextExport(buffer);method=['WHATSAPP','INSTAGRAM','TIKTOK','CONVERSATION'].includes(sourceType)?'CONVERSATION_EXPORT':'PLAIN_TEXT';
  }
  text=method==='CONVERSATION_EXPORT'?deidentifyConversation(text):cleanText(text);
  if(text.length<20) throw new Error('No usable text could be extracted from this file.');
  if(text.length>2_000_000){text=text.slice(0,2_000_000);warnings.push('Extracted text was capped at two million characters.');}
  return {text,checksum:createHash('sha256').update(buffer).digest('hex'),method,mimeType:mime,byteSize:file.size,warnings};
}
