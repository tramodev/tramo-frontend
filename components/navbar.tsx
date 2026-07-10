import { Button } from './ui/button';
import { ThemeToggle } from './theme-toggle';
import { cookies } from 'next/headers';
import { handleLogout } from '@/app/actions';

export async function Navbar() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken');
  const refreshToken = cookieStore.get('refreshToken');
  const isLoggedIn = !!(accessToken || refreshToken);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex bg-primary items-center justify-between px-6 py-4 transition-all duration-300 ease-in-out border-b border-border"
    >
      <div className="flex items-center gap-8">
        <a href="/" className="flex items-center gap-1 group">
          <span className="font-extrabold text-xl tracking-tight text-primary-foreground">MyPath</span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent mb-1 ml-0.5 animate-pulse"></span>
        </a>
        <div className="hidden md:flex items-center text-sm font-medium text-primary-foreground/90">
          <Button variant={"link"} className="text-primary-foreground underline-none">Product</Button>
          <Button variant={"link"} className="text-primary-foreground underline-none">Pricing</Button>
          <Button variant={"link"} className="text-primary-foreground underline-none">Community</Button>
          <Button variant={"link"} className="text-primary-foreground underline-none">Blog</Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" />
        {isLoggedIn ? (
          <>
            <Button variant="secondary" asChild>
              <a href="/dashboard">Dashboard</a>
            </Button>
            <form action={handleLogout}>
              <Button type="submit" variant="secondary">
                Log Out
              </Button>
            </form>
          </>
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