/** Settings carried by a share link; mirrors the Run settings, never the Trace. */
export interface SharedSettings {
  budgets?: Partial<Record<'nodes' | 'tasks' | 'virtualMs' | 'events', number>>
  nodeCostUs?: number
  randomSeed?: number
}

export interface SharePayload {
  script: string
  settings: SharedSettings
}

const PREFIX = '#share='
const VERSION = 1

/** Fragment (not query) so the Script never reaches a server or its logs. */
export function encodeShareFragment(payload: SharePayload): string {
  const json = JSON.stringify({ v: VERSION, script: payload.script, settings: payload.settings })
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const base64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return PREFIX + base64
}

/** Returns null for anything that is not a well-formed share fragment, so the app falls back to its default Script. */
export function decodeShareFragment(fragment: string): SharePayload | null {
  if (!fragment.startsWith(PREFIX)) return null
  try {
    const base64 = fragment.slice(PREFIX.length).replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const data: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (typeof data !== 'object' || data === null) return null
    const { v, script, settings } = data as Record<string, unknown>
    if (v !== VERSION || typeof script !== 'string') return null
    if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) return null
    return { script, settings: settings as SharedSettings }
  } catch {
    return null
  }
}
