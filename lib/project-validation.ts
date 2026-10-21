export const PROJECT_TEXT_MAX_LENGTH = 255;

export function assertProjectText(value: string, field: 'title' | 'description') {
  if (value.length > PROJECT_TEXT_MAX_LENGTH) {
    throw new Error(`Project ${field} must be ${PROJECT_TEXT_MAX_LENGTH} characters or fewer.`);
  }
}
