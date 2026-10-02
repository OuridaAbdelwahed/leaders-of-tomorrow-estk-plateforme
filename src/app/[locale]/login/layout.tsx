import { privateMetadata } from '@/lib/site';

export const metadata = privateMetadata('Member sign in', 'Private member authentication for Leaders of Tomorrow.');

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
