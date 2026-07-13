import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getMyProfile } from '@/lib/profile';

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken');
  const refreshToken = cookieStore.get('refreshToken');
  const isLoggedIn = !!(accessToken || refreshToken);
  const username = cookieStore.get('username')?.value ?? '';
  const imageUrl = isLoggedIn ? (await getMyProfile())?.imageUrl ?? null : null;

  return NextResponse.json({ isLoggedIn, username, imageUrl });
}
