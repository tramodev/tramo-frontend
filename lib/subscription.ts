'use server';
import { authenticatedFetch } from "./api";
import { API_BASE_URL } from "./config";
import { parseResponse } from "./http";

export interface SubscriptionStatus {
  premium: boolean;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  publishesUsedThisWeek: number;
  publishesPerWeek: number; // -1 = unlimited
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/subscription`);
  return parseResponse<SubscriptionStatus>(response);
}

export async function mockUpgrade(): Promise<SubscriptionStatus> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/subscription/mock-upgrade`, { method: "POST" });
  return parseResponse<SubscriptionStatus>(response);
}

export async function cancelSubscription(): Promise<SubscriptionStatus> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/subscription`, { method: "DELETE" });
  return parseResponse<SubscriptionStatus>(response);
}
