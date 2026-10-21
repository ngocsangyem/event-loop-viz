/**
 * The event-loop concepts every element can be tinted with (DESIGN.md · Concept colours).
 * Each maps to the token triple in docs/design/tokens.css: full hue, -soft fill, -border.
 * Orange (`loop`) is the accent and means "now"; it is not a queue concept.
 */
export const CONCEPTS = ['stack', 'job', 'task', 'webapi', 'console', 'error', 'loop'] as const
export type Concept = (typeof CONCEPTS)[number]

/** Inline CSS variables that point an element's --hue* at one concept's tokens. */
export function hueVars(concept: Concept | undefined): Record<string, string> {
  if (!concept || !CONCEPTS.includes(concept)) {
    return { '--hue': 'var(--color-ink-3)', '--hue-soft': 'var(--color-hover-row)', '--hue-border': 'var(--color-line)' }
  }
  if (concept === 'loop') {
    return {
      '--hue': 'var(--brand)',
      '--hue-soft': 'color-mix(in srgb, var(--brand) 11%, transparent)',
      '--hue-border': 'color-mix(in srgb, var(--brand) 36%, transparent)',
    }
  }
  return { '--hue': `var(--${concept})`, '--hue-soft': `var(--${concept}-soft)`, '--hue-border': `var(--${concept}-border)` }
}
