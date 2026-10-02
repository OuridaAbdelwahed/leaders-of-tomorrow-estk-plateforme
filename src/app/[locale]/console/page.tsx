import { notFound } from 'next/navigation';
import { AdminConsole } from '@/components/AdminConsole';
import { privateMetadata } from '@/lib/site';

export const metadata = privateMetadata('Operations console', 'Restricted Leaders of Tomorrow administration area.');

export default async function ConsolePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: portal } = await params;
  if (portal !== process.env.ADMIN_PORTAL_SLUG) notFound();
  return <AdminConsole portal={portal} />;
}
