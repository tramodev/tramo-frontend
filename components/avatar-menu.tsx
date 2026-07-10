"use client"

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { FolderKanban, LogOut, Moon, Sun } from 'lucide-react';
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
        <button className="rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {username && <DropdownMenuLabel>{username}</DropdownMenuLabel>}
        {username && <DropdownMenuSeparator />}
        <DropdownMenuItem asChild>
          <a href="/projects" className="cursor-pointer">
            <FolderKanban />
            Projects
          </a>
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
