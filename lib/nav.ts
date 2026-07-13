import { cookies } from "next/headers";

export async function getHomeHref(): Promise<string> {
  const cookieStore = await cookies();
  const isLoggedIn = !!(cookieStore.get("accessToken") || cookieStore.get("refreshToken"));
  return isLoggedIn ? "/projects" : "/";
}
