import type { NarratedStep } from './narrate-trace'

type Translate = (key: string, params?: Record<string, unknown>) => string

const BASE = 'drive.narration'
/** `taskQueued.port-message` → `taskQueued.portMessage`: task sources are kebab-case, message keys camelCase. */
const keyOf = (variant: string) => variant.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
/** Only worded phrases are capitalized when they open a sentence; code (`f`, `console.log()`) never is. */
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * The title and body of a step built from the Trace. Names and the callback are worded the way
 * the learner reads them: `(anonymous)` becomes "the anonymous function", a callback is "the
 * callback on line 4" (or "the rest of f" for an await), the Halt names its Budget. `Name` and
 * `Callback` are the forms for the start of a sentence.
 */
export function narratedText(step: NarratedStep, t: Translate): { title: string; body: string } {
  const p = step.params
  const anonymous = p.name === '(anonymous)'
  const name = anonymous ? t(`${BASE}.anonymous`) : String(p.name ?? '')
  const line = p.line === '' || p.line === undefined ? (step.line ?? null) : p.line
  const callback = step.variant === 'jobQueued.await'
    ? t(`${BASE}.restOf`, { name })
    : line !== null ? t(`${BASE}.callbackOnLine`, { line }) : t(`${BASE}.callback`)
  const params: Record<string, unknown> = {
    ...p,
    name,
    Name: anonymous ? capital(name) : name,
    callback,
    Callback: capital(callback),
    line: line ?? '',
  }
  if (step.kind === 'console') params.text = `"${p.text}"`
  if (step.kind === 'halt' && step.variant === 'halt.budget') {
    params.reason = t(`halt.name.${p.reason}`)
    params.limit = `${Number(p.limit).toLocaleString('en-US')} ${t(`halt.unit.${p.reason}`)}`
  }
  const variant = step.kind === 'call' && anonymous ? 'call.anonymous' : step.variant
  const key = `${BASE}.${keyOf(variant)}`
  return { title: t(`${key}.title`, params), body: t(`${key}.body`, params) }
}
