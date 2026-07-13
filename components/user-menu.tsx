"use client"

import { useEffect, useState } from 'react';
import { AvatarMenu } from './avatar-menu';

interface Session {
  isLoggedIn: boolean;
  username: string;
  imageUrl: string | null;
}

export function UserMenu() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/session')
      .then((res) => res.json())
      .then((data: Session) => {
        if (!cancelled) setSession(data);
      })
      .catch(() => {
        if (!cancelled) setSession({ isLoggedIn: false, username: '', imageUrl: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!session?.isLoggedIn) return null;

  return <AvatarMenu username={session.username} imageUrl={session.imageUrl} />;
}
