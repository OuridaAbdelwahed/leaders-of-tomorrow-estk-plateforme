'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type AnimatedNumberProps = {
  value: number;
  locale?: string;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  decimals?: number;
  className?: string;
};

export function AnimatedNumber({ value, locale = 'en', prefix = '', suffix = '', durationMs = 900, decimals = 0, className }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const elementRef = useRef<HTMLSpanElement | null>(null);
  const formatter = useMemo(() => new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }), [decimals, locale]);

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || target === 0) {
      const frame = window.requestAnimationFrame(() => setDisplayValue(target));
      return () => window.cancelAnimationFrame(frame);
    }

    let frame = 0;
    let startedAt = 0;
    const run = (timestamp: number) => {
      if (!startedAt) startedAt = timestamp;
      const progress = Math.min(1, (timestamp - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(target * eased);
      if (progress < 1) frame = window.requestAnimationFrame(run);
    };

    const start = () => {
      setDisplayValue(0);
      frame = window.requestAnimationFrame(run);
    };

    if (!('IntersectionObserver' in window) || !elementRef.current) {
      start();
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        start();
      }
    }, { threshold: 0.35 });
    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [durationMs, value]);

  return <span ref={elementRef} className={className}>{prefix}{formatter.format(displayValue)}{suffix}</span>;
}
