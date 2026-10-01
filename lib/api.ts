    'use server';
import { redirect } from 'next/navigation';
import { getAccessToken, refreshAccessToken } from './auth';

const BIRTH_DATE_GATE_EXEMPT_PATHS = ['/api/auth/birth-date', '/api/auth/logout'];

export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = await getAccessToken();

  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      token = await getAccessToken();
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  if (response.status === 403 && !BIRTH_DATE_GATE_EXEMPT_PATHS.some((path) => url.includes(path))) {
    const data = await response.clone().json().catch(() => null);
    if (data?.message === 'Please provide your birth date to continue.') {
      redirect('/onboarding/birth-date');
    }
  }

  return response;
}