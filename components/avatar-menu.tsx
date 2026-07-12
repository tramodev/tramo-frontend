"use client"

import * as React from 'react';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { LogOut, Moon, Sun } from 'lucide-react';
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
      <DropdownMenuContent align="end">
        {username && <DropdownMenuLabel>{username}</DropdownMenuLabel>}
        {username && <DropdownMenuSeparator />}
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
