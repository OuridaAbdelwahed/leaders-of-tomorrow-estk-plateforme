'use client';

import { AccountCircleOutlined, ArrowForward } from '@mui/icons-material';
import { Button, type ButtonProps } from '@mui/material';
import { usePathname } from 'next/navigation';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Member } from '@/lib/types';

export type PublicMember = Omit<Member, 'passwordHash'>;
type MemberSessionValue = {
  member: PublicMember | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const MemberSessionContext = createContext<MemberSessionValue>({ member: null, loading: true, refresh: async () => undefined });

export function MemberSessionProvider({ children, initialMember = null }: { children: ReactNode; initialMember?: PublicMember | null }) {
  const [member, setMember] = useState<PublicMember | null>(initialMember);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/member/me', { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) {
        setMember(null);
        return;
      }
      const payload = await response.json() as { member?: PublicMember };
      setMember(payload.member ?? null);
    } catch {
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/member/me', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
      .then(async response => response.ok ? (await response.json() as { member?: PublicMember }).member ?? null : null)
      .then(setMember)
      .catch(error => { if (error instanceof Error && error.name !== 'AbortError') setMember(null); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [pathname]);

  const value = useMemo(() => ({ member, loading, refresh }), [member, loading, refresh]);
  return <MemberSessionContext.Provider value={value}>{children}</MemberSessionContext.Provider>;
}

export const useMemberSession = () => useContext(MemberSessionContext);

type MemberAwareCtaProps = Omit<ButtonProps, 'href' | 'children' | 'ref'> & {
  locale: string;
  guestHref?: string;
  guestLabel: string;
  memberLabel?: string;
};

export function MemberAwareCta({ locale, guestHref, guestLabel, memberLabel, endIcon, ...props }: MemberAwareCtaProps) {
  const { member } = useMemberSession();
  const href = member ? `/${locale}/member` : (guestHref ?? `/${locale}/join`);
  return (
    <Button {...props} href={href} endIcon={endIcon ?? (member ? <AccountCircleOutlined /> : <ArrowForward />)}>
      {member ? (memberLabel ?? (locale === 'ar' ? 'مساحتي' : 'My member space')) : guestLabel}
    </Button>
  );
}
