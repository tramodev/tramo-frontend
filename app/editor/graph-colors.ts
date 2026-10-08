export const GRAPH_COLORS = ["red", "orange", "green", "blue", "purple", "gray"] as const
export type GraphColor = typeof GRAPH_COLORS[number]
export type GraphColors = { items: Record<string, GraphColor>; trails: Record<string, GraphColor> }

export function parseGraphColors(input: string | null | undefined): GraphColors {
  const valid = (value: unknown) => Object.fromEntries(
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.entries(value).filter((entry): entry is [string, GraphColor] => GRAPH_COLORS.includes(entry[1] as GraphColor))
      : [],
  )
  try {
    const stored = JSON.parse(input || "{}")
    return { items: valid(stored?.items), trails: valid(stored?.trails) }
  } catch { return { items: {}, trails: {} } }
}
