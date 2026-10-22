/**
 * Which built-in calls a walkthrough shows, and how it names them. Only calls the Script writes
 * itself count: the built-in's name must appear as a call on the line it runs from, so the
 * engine's own helpers (the Promise constructor behind an async function, species lookups,
 * message dispatch) never show up as steps.
 */
const CONSOLE_METHODS = new Set(['log', 'info', 'warn', 'error'])
const PROMISE_STATICS = new Set(['resolve', 'reject', 'all', 'allSettled', 'any', 'race'])
const CLOCK_METHODS = new Set(['now'])

/** How the call looks in the Script, to find it on its line. */
function callPattern(label: string): RegExp | null {
  const setter = /^set (\w+)$/.exec(label)
  if (setter) return new RegExp(`\\.${setter[1]}\\s*=`)
  if (!/^[A-Za-z_$][\w$]*$/.test(label)) return null
  return new RegExp(`(?:^|[^\\w$])${label}\\s*\\(`)
}

export function builtinShown(label: string, lineText: string): boolean {
  const pattern = callPattern(label)
  return pattern !== null && pattern.test(lineText)
}

/** `console.log`, `Promise.resolve`, `Date.now`, `.then`, `new MessageChannel`, `ch.port1.onmessage =` … as written. */
export function callNameOf(label: string, lineText: string): string {
  if (CONSOLE_METHODS.has(label) && lineText.includes(`console.${label}`)) return `console.${label}()`
  if (PROMISE_STATICS.has(label) && lineText.includes(`Promise.${label}`)) return `Promise.${label}()`
  if (CLOCK_METHODS.has(label)) {
    const owner = /(\w+)\.now\s*\(/.exec(lineText)?.[1]
    if (owner) return `${owner}.now()`
  }
  const setter = /^set (\w+)$/.exec(label)
  if (setter) return `.${setter[1]} =`
  if (new RegExp(`new\\s+${label}\\s*\\(`).test(lineText)) return `new ${label}()`
  if (new RegExp(`\\.${label}\\s*\\(`).test(lineText)) return `.${label}()`
  return `${label}()`
}
