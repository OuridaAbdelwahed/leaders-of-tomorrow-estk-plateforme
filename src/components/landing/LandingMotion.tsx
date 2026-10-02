'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'scale';
};

export function Reveal({ children, className, delay = 0, direction = 'up' }: RevealProps) {
  const reduceMotion = useReducedMotion();
  const offset = direction === 'left' ? { x: -20, y: 0 } : direction === 'right' ? { x: 20, y: 0 } : direction === 'scale' ? { scale: 0.985 } : { y: 18 };

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0.92, ...offset }}
      whileInView={reduceMotion ? undefined : { opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.64, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function FloatingBadge({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      animate={reduceMotion ? undefined : { y: [0, -9, 0], rotate: [0, 1.5, 0] }}
      transition={{ duration: 5.8, ease: 'easeInOut', repeat: Infinity }}
    >
      {children}
    </motion.div>
  );
}
