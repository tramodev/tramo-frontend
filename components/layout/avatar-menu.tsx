// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useMounted } from '@/hooks/use-mounted';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Moon, Settings, Sun, SunMoon } from 'lucide-react';
import { handleLogout } from '@/app/actions';
import { clearLocalDrafts, listDrafts } from '@/lib/editor-draft';
import { hasPendingItemTitles } from '@/lib/item-title-saves';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { initial } from '@/components/shared/author-avatar';
import type { NavItem } from '@/lib/nav-items';

export function AvatarMenu({
  username,
  imageUrl,
  navItems,
}: {
  username: string;
  imageUrl?: string | null;
  navItems?: NavItem[];
}) {
  const [confirmLogout, setConfirmLogout] = React.useState(false);
  const logout = () => { clearLocalDrafts(); void handleLogout(); };
  const initials = initial(username);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === 'dark';
  const ThemeIcon = mounted && theme === 'system' ? SunMoon : isDark ? Moon : Sun;

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-medium text-primary-foreground outline-none"
          aria-label="Account menu"
        >
          {imageUrl ? (
            <Image src={imageUrl} alt="" fill sizes="40px" className="object-cover" />
          ) : (
            initials
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {username && (
          <DropdownMenuItem asChild className="flex-col items-stretch gap-1 py-2">
            <Link href="/profile">
              <div className="flex items-center gap-2">
                <span
                  className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-[0.6875rem] font-medium w-6 h-6 bg-primary text-primary-foreground"
                >
                  {imageUrl ? (
                    <Image src={imageUrl} alt="" fill sizes="24px" className="object-cover" />
                  ) : (
                    initials
                  )}
                </span>
                <span className="truncate font-semibold">{username}</span>
              </div>
              <span className="text-xs text-muted-foreground">My profile</span>
            </Link>
          </DropdownMenuItem>
        )}
        {navItems && navItems.length > 0 && (
          <>
            <DropdownMenuSeparator className="md:hidden" />
            {navItems.map((item) => (
              <DropdownMenuItem key={item.key} asChild className="md:hidden">
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ThemeIcon />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={mounted ? theme : undefined} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="system">
                <SunMoon />
                Use device theme
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="light">
                <Sun />
                Light theme
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon />
                Dark theme
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => {
          try {
            const userId = localStorage.getItem('tramo:draft-owner');
            if (userId && (listDrafts(userId).length || hasPendingItemTitles(userId))) { setConfirmLogout(true); return; }
          } catch { setConfirmLogout(true); return; }
          logout();
        }}>
          <LogOut />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <ConfirmDialog open={confirmLogout} onOpenChange={setConfirmLogout}
      title="Discard unsynced drafts and log out?"
      description="You have drafts that have not finished syncing. Logging out will delete their local backups. Cancel to keep editing or wait for them to sync."
      confirmLabel="Discard drafts and log out" onConfirm={logout} />
  </>;
}
