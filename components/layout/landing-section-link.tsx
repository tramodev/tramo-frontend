"use client"

import Link from 'next/link';
import type { ComponentProps } from 'react';

export function LandingSectionLink({ href, ...props }: Omit<ComponentProps<typeof Link>, 'href' | 'onNavigate'> & { href: '/' | '/#product' | '/#pricing' }) {
  return <Link {...props} href={href} onNavigate={event => {
    const section = document.getElementById(href === '/' ? 'home' : href.slice(2));
    if (!section) return;
    event.preventDefault();
    section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }} />;
}
