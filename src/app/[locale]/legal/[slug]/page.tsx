import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPolicyPage } from '@/components/legal/LegalPolicyPage';
import { getLegalPolicy } from '@/lib/legal';
import { localizedMetadata } from '@/lib/site';

export async function generateMetadata({params}:{params:Promise<{locale:string;slug:string}>}):Promise<Metadata>{const {locale,slug}=await params;const policy=getLegalPolicy(slug);if(!policy)return {};return localizedMetadata({locale,path:`legal/${slug}`,title:locale==='ar'?policy.title.ar:policy.title.en,description:locale==='ar'?policy.summary.ar:policy.summary.en});}
export default async function Page({params}:{params:Promise<{locale:string;slug:string}>}){const {locale,slug}=await params;if(!getLegalPolicy(slug))notFound();return <LegalPolicyPage locale={locale} slug={slug}/>;}
