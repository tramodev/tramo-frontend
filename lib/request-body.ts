const MAX_REQUEST_BYTES = 4 * 1024 * 1024;

const tooLarge = () => Response.json({ code: 'PAYLOAD_TOO_LARGE', message: 'Requests must not exceed 4 MiB.' }, { status: 413 });

export async function readRequestBody(request: Request): Promise<string | Response> {
  if (Number(request.headers.get('content-length')) > MAX_REQUEST_BYTES) {
    await request.body?.cancel();
    return tooLarge();
  }
  const reader = request.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let bytes = 0, text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) return text + decoder.decode();
      bytes += chunk.value.byteLength;
      if (bytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return tooLarge();
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}
