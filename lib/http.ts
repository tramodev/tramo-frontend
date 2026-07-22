// Shared HTTP helpers. Plain module (no "use server") so these can be imported
// anywhere — they take/return a Response, which is not a serializable action arg.

export async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function expectOk(response: Response): Promise<void> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}
