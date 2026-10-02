import type { Metadata } from 'next';
import { LegalHub } from '@/components/legal/LegalHub';
import { localizedMetadata } from '@/lib/site';

export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const {locale}=await params;return localizedMetadata({locale,path:'legal',title:locale==='ar'?'المركز القانوني والثقة':'Legal & Trust Center',description:locale==='ar'?'السياسات والاتفاقيات الرسمية لمنصة ونادي قادة الغد.':'Official policies and agreements for the Leaders of Tomorrow Club and platform.'});}
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;return <LegalHub locale={locale}/>;}
