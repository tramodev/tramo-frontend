import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const failure = new URL("/settings?tab=plan&patreon=error", request.url);
  const expected = cookieStore.get("patreonState")?.value;
  if (!state || !expected || state !== expected) {
    return NextResponse.redirect(failure);
  }
  cookieStore.set("patreonState", "", { maxAge: 0, path: "/api/auth/patreon/callback" });
  if (!code || request.nextUrl.searchParams.has("error")) {
    return NextResponse.redirect(failure);
  }
  const query = new URLSearchParams({ state, code });
  const response = await authenticatedFetch(`${API_BASE_URL}/api/auth/patreon/complete?${query}`, {
    redirect: "manual",
  }).catch(() => null);
  const location = response?.headers.get("Location");
  if (response?.status === 302 && location) {
    const target = new URL(location, request.url);
    if (target.origin === request.nextUrl.origin && target.pathname === "/settings") {
      return NextResponse.redirect(target);
    }
    if (target.href === "https://www.patreon.com/cw/Tramodev/membership") {
      return NextResponse.redirect(target);
    }
  }
  return NextResponse.redirect(failure);
}
