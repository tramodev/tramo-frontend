import { Button } from './ui/button';
import { Wordmark } from './logo';
import { AvatarMenu } from './avatar-menu';
import { cookies } from 'next/headers';

export async function Navbar() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken');
  const refreshToken = cookieStore.get('refreshToken');
  const isLoggedIn = !!(accessToken || refreshToken);
  const username = cookieStore.get('username')?.value ?? '';

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex bg-primary items-center justify-between px-6 py-4 transition-all duration-300 ease-in-out border-b border-border"
    >
      <div className="flex items-center gap-8">
        <a href="/" className="group">
          <Wordmark className="text-primary-foreground" />
        </a>
        <div className="hidden md:flex items-center text-sm font-medium text-primary-foreground/90">
          <Button variant={"link"} className="text-primary-foreground underline-none">Product</Button>
          <Button variant={"link"} className="text-primary-foreground underline-none">Pricing</Button>
          <Button variant={"link"} className="text-primary-foreground underline-none">Community</Button>
          <Button variant={"link"} className="text-primary-foreground underline-none">Blog</Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isLoggedIn ? (
          <AvatarMenu username={username} />
        ) : (
          <>
            <Button variant={"link"} className="text-primary-foreground underline-none">
              <a href="/login">Log In</a>
            </Button>
            <Button variant="secondary">
              <a href="/signup">Sign Up</a>
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
