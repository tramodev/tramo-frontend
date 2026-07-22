import { parseResponse, expectOk } from "./http";

export async function getItemContent(itemId: string): Promise<string> {
  const response = await fetch(`/api/item/${itemId}/content`);
  const data = await parseResponse<{ content?: string }>(response);
  return data.content ?? "";
}

export async function saveItemContent(itemId: string, content: string): Promise<void> {
  const response = await fetch(`/api/item/${itemId}/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  await expectOk(response);
}
