import Link from 'next/link';
import { AvatarMenu } from './avatar-menu';
import { NavMobileMenu } from './nav-mobile-menu';
import { Wordmark } from './logo';
import { Button } from './ui/button';
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
      <div className="max-w-[1216px] mx-auto px-6 md:px-[72px] py-3 flex items-center gap-2">
        <Link href={homeHref} className="mr-auto">
          <Wordmark />
        </Link>
        <a
          href="#product"
          className="hidden md:block text-sm font-medium text-muted-foreground px-4 py-2.5 rounded-full transition-colors hover:bg-muted hover:text-foreground"
        >
          Product
        </a>
        <Link
          href="/explore"
          className="hidden md:block text-sm font-medium text-muted-foreground px-4 py-2.5 rounded-full transition-colors hover:bg-muted hover:text-foreground"
        >
          Explore
        </Link>
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <AvatarMenu username={username} imageUrl={imageUrl} />
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/login"
                className="text-sm font-medium text-primary px-4 py-2.5 rounded-full transition-colors hover:bg-muted ml-2"
              >
                Sign in
              </Link>
              <Button asChild size="lg">
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          )}
        </div>
        <NavMobileMenu isLoggedIn={isLoggedIn} />
      </div>
    </nav>
  );
}
