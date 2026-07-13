
export async function getIdeaContent(ideaId: string): Promise<string> {
  const response = await fetch(`/api/idea/${ideaId}/content`);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const data = await response.json();
  return data.content ?? "";
}

export async function saveIdeaContent(ideaId: string, content: string): Promise<void> {
  const response = await fetch(`/api/idea/${ideaId}/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}
