// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only

export type LandingSection = 'product' | 'open' | 'pricing';

export const LANDING_SECTIONS: { href: `/#${LandingSection}`; label: string }[] = [
  { href: '/#product', label: 'Product' },
  { href: '/#open', label: 'Open source' },
  { href: '/#pricing', label: 'Plans' },
];
