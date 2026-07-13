"use client"

import * as React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { LogOut, Moon, Settings, Sun } from 'lucide-react';
import { handleLogout } from '@/app/actions';

export function AvatarMenu({ username }: { username: string }) {
  const initials = username.slice(0, 2).toUpperCase();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="avatar-chip outline-none" aria-label="Account menu">
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {username && (
          <DropdownMenuItem asChild className="flex-col items-stretch gap-1 py-2">
            <Link href="/profile">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex shrink-0 items-center justify-center text-[11px] font-extrabold"
                  style={{ width: 24, height: 24, background: 'var(--color-text)', color: 'var(--color-bg)' }}
                >
                  {initials}
                </span>
                <span className="truncate font-semibold">{username}</span>
              </div>
              <span className="text-xs text-muted-foreground">My profile</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setTheme(isDark ? 'light' : 'dark');
          }}
        >
          {isDark ? <Sun /> : <Moon />}
          {isDark ? 'Light mode' : 'Dark mode'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild variant="destructive">
          <form action={handleLogout} className="w-full">
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut />
              Log Out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
