'use client';

import { createContext, useContext, type ReactNode } from 'react';

const CurrentUser = createContext<string | null>(null);

export function CurrentUserProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  return <CurrentUser.Provider value={userId}>{children}</CurrentUser.Provider>;
}

export const useCurrentUserId = () => useContext(CurrentUser);
