"use client"

import * as React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
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
} from './ui/dropdown-menu';
import { LogOut, Moon, Settings, Sun, SunMoon } from 'lucide-react';
import { handleLogout } from '@/app/actions';

export function AvatarMenu({ username, imageUrl }: { username: string; imageUrl?: string | null }) {
  const initials = username.slice(0, 2).toUpperCase();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';
  const ThemeIcon = mounted && theme === 'system' ? SunMoon : isDark ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-medium text-primary-foreground outline-none"
          aria-label="Account menu"
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
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
                  className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-medium w-6 h-6 bg-primary text-primary-foreground"
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
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
