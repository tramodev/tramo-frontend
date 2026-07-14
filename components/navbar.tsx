import Link from 'next/link';
import { AvatarMenu } from './avatar-menu';
import { Wordmark } from './logo';
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
    <nav className="border-b-2 border-(--color-divider)">
      <div className="max-w-[1216px] mx-auto px-[72px] py-3 flex items-center gap-8">
        <Link href={homeHref} className="mr-auto">
          <Wordmark />
        </Link>
        <a href="#product" className="text-sm hover:text-[var(--color-accent-600)] transition-colors">
          Product
        </a>
        <Link href="/explore" className="text-sm hover:text-[var(--color-accent-600)] transition-colors">
          Explore
        </Link>
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <AvatarMenu username={username} imageUrl={imageUrl} />
          ) : (
            <>
              <Link href="/login" className="text-sm hover:text-[var(--color-accent-600)] transition-colors mr-5">
                Sign in
              </Link>
              <Link href="/signup" className="btn btn-primary text-white">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
