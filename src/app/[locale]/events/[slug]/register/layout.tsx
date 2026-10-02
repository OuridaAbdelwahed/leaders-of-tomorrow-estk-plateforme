import { privateMetadata } from '@/lib/site';

export const metadata = privateMetadata('Event registration', 'Secure event registration and email verification.');

export default function RegistrationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
