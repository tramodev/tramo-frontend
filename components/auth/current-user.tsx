'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { clearLocalDrafts } from '@/lib/editor-draft';

const CurrentUser = createContext<string | null>(null);

export function CurrentUserProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  useEffect(() => { clearLocalDrafts(userId); }, [userId]);
  return <CurrentUser.Provider value={userId}>{children}</CurrentUser.Provider>;
}

export const useCurrentUserId = () => useContext(CurrentUser);
