/**
 * List props on custom elements arrive either as a DOM property (an array, from JSX or script) or
 * as a JSON string attribute (plain HTML). This normalises both; bad JSON yields an empty list so
 * the element shows its empty state instead of throwing.
 */
export function parseListProp<T>(value: T[] | string | undefined): T[] {
  if (Array.isArray(value)) return value
  try {
    const parsed: unknown = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}
