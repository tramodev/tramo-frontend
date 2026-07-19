'use client';

import { motion, MotionConfig, type Variants } from 'motion/react';

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

/** Scroll-reveal: fade + rise, fires once. */
export function FadeUp({
  children,
  delay = 0,
  scaleIn = false,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  scaleIn?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24, ...(scaleIn && { scale: 0.98 }) }}
      whileInView={{ opacity: 1, y: 0, ...(scaleIn && { scale: 1 }) }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

export const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export function StaggerGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} initial="hidden" animate="visible" variants={staggerParent}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={staggerChild}>
      {children}
    </motion.div>
  );
}

/** Respects prefers-reduced-motion for everything inside. */
export function LandingMotionConfig({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export { motion, EASE };
