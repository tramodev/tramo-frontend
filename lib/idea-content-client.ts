import { parseResponse, expectOk } from "./http";

export async function getIdeaContent(ideaId: string): Promise<string> {
  const response = await fetch(`/api/idea/${ideaId}/content`);
  const data = await parseResponse<{ content?: string }>(response);
  return data.content ?? "";
}

export async function saveIdeaContent(ideaId: string, content: string): Promise<void> {
  const response = await fetch(`/api/idea/${ideaId}/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  await expectOk(response);
}
