import { API_BASE_URL } from "@/lib/config";
import { authenticatedFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const backendResponse = await authenticatedFetch(`${API_BASE_URL}/api/notifications/stream`, {
    headers: { Accept: "text/event-stream" },
  });

  if (!backendResponse.ok || !backendResponse.body) {
    return new Response(null, { status: backendResponse.status });
  }

  return new Response(backendResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
