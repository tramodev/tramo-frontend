// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';
import { logout } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function handleLogout() {
  await logout();
  redirect('/login');
}