'use server';

import { API_BASE_URL } from "./config";
import { authenticatedFetch } from "./api";
import { logout } from "./auth";

export type AccountActionResult = { success: true } | { success: false; error: string };

async function extractError(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.message === "string") return data.message;
    if (data?.errors && typeof data.errors === "object") {
      const first = Object.values(data.errors)[0];
      if (typeof first === "string") return first;
    }
  } catch {
  }
  return fallback;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<AccountActionResult> {
  const response = await authenticatedFetch(`${API_BASE_URL}/user/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!response.ok) {
    return { success: false, error: await extractError(response, "Couldn't change password, try again") };
  }
  await logout();
  return { success: true };
}

export async function deleteAccount(): Promise<AccountActionResult> {
  const response = await authenticatedFetch(`${API_BASE_URL}/user/me`, { method: "DELETE" });
  if (!response.ok) {
    return { success: false, error: await extractError(response, "Couldn't delete account, try again") };
  }
  await logout();
  return { success: true };
}
