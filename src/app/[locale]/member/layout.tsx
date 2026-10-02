import { privateMetadata } from '@/lib/site';

export const metadata = privateMetadata('Member profile', 'Private Leaders of Tomorrow member area.');

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return children;
}
