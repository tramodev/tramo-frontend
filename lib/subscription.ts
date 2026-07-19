'use server';
import { authenticatedFetch } from "./api";
import { API_BASE_URL } from "./config";

export interface SubscriptionStatus {
  premium: boolean;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  publishesUsedThisWeek: number;
  publishesPerWeek: number; // -1 = unlimited
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/subscription`);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function mockUpgrade(): Promise<SubscriptionStatus> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/subscription/mock-upgrade`, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function cancelSubscription(): Promise<SubscriptionStatus> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/subscription`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}
