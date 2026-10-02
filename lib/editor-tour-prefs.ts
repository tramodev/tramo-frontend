'use server';
import { authenticatedFetch } from "./api";
import { API_BASE_URL } from "./config";

export async function setEditorTourSeen(seen: boolean = true): Promise<{ error: string | null }> {
  const response = await authenticatedFetch(`${API_BASE_URL}/user/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ editorTourSeen: seen }),
  });
  if (!response.ok) {
    return { error: `Request failed with status ${response.status}` };
  }
  return { error: null };
}
