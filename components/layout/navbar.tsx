// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import Link from 'next/link';
import { AvatarMenu } from '@/components/layout/avatar-menu';
import { NavMobileMenu } from '@/components/layout/nav-mobile-menu';
import { ResourcesMenu } from '@/components/layout/resources-menu';
import { Wordmark } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { cookies } from 'next/headers';
import { getMyProfile } from '@/lib/profile';

export async function Navbar() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken');
  const refreshToken = cookieStore.get('refreshToken');
  const isLoggedIn = !!(accessToken || refreshToken);
  const username = cookieStore.get('username')?.value ?? '';
  const imageUrl = isLoggedIn ? (await getMyProfile())?.imageUrl ?? null : null;
  const homeHref = isLoggedIn ? '/projects' : '/';

  return (
    <nav className="sticky top-0 z-10 bg-background">
      <div className="container-app grid grid-cols-[1fr_auto] items-center gap-2 px-6 py-3 md:px-12 lg:grid-cols-[1fr_auto_1fr]">
        <Link href={homeHref} className="justify-self-start">
          <Wordmark />
        </Link>
        <div className="hidden items-center gap-1 lg:flex">
          <Link
            href="/#product"
            className="text-sm font-medium text-muted-foreground px-4 py-2.5 rounded-full transition-colors hover:bg-muted hover:text-foreground"
          >
            Product
          </Link>
          <Link
            href="/#pricing"
            className="text-sm font-medium text-muted-foreground px-4 py-2.5 rounded-full transition-colors hover:bg-muted hover:text-foreground"
          >
            Plans
          </Link>
          <ResourcesMenu />
        </div>
        <div className="flex items-center justify-self-end gap-2">
          {isLoggedIn ? (
            <AvatarMenu username={username} imageUrl={imageUrl} />
          ) : (
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/login"
                className="text-sm font-medium text-primary px-4 py-2.5 rounded-full transition-colors hover:bg-muted"
              >
                Log In
              </Link>
              <Button asChild size="lg">
                <Link href="/signup">Start for free</Link>
              </Button>
            </div>
          )}
          <NavMobileMenu isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </nav>
  );
}
