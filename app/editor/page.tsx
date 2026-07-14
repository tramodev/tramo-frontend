"use client"
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EditorIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/projects');
  }, [router]);

  return null;
}
