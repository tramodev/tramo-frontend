'use server';
import { authenticatedFetch } from "./api";
import { API_BASE_URL } from "./config";

export type EmailDigestFrequency = "off" | "daily" | "weekly";

export async function getEmailDigestFrequency(): Promise<EmailDigestFrequency> {
  const response = await authenticatedFetch(`${API_BASE_URL}/user/preferences`);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const data = await response.json();
  return data.emailDigestFrequency;
}

export async function setEmailDigestFrequency(frequency: EmailDigestFrequency): Promise<{ error: string | null }> {
  const response = await authenticatedFetch(`${API_BASE_URL}/user/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailDigestFrequency: frequency }),
  });
  if (!response.ok) {
    return { error: `Request failed with status ${response.status}` };
  }
  return { error: null };
}
