// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { AvatarMenu } from './avatar-menu';
import type { NavItem } from '@/lib/nav-items';

export function UserMenu({
  loggedIn,
  username,
  imageUrl,
  navItems,
}: {
  loggedIn: boolean;
  username: string | null;
  imageUrl: string | null;
  navItems?: NavItem[];
}) {
  if (!loggedIn || !username) return null;

  return <AvatarMenu username={username} imageUrl={imageUrl} navItems={navItems} />;
}
