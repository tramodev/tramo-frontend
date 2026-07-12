import { cookies } from "next/headers";

// Logo destination convention used across the app: logged-in users land on
// their project list (the actual app home), logged-out visitors land on the
// marketing page.
export async function getHomeHref(): Promise<string> {
  const cookieStore = await cookies();
  const isLoggedIn = !!(cookieStore.get("accessToken") || cookieStore.get("refreshToken"));
  return isLoggedIn ? "/projects" : "/";
}
