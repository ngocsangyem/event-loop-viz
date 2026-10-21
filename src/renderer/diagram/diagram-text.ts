/** Width of one glyph of the diagram's monospace text, in viewBox units at 12px. */
export const CHAR_WIDTH = 7.2

/** The most characters that fit in `width` units. */
export const charsThatFit = (width: number): number => Math.max(0, Math.floor(width / CHAR_WIDTH))

/** Cuts `text` to `max` characters, ending in an ellipsis when it had to cut. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return max <= 1 ? '…'.slice(0, max) : `${text.slice(0, max - 1)}…`
}
