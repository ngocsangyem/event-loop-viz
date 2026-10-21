/** Failure classes the UI explains in the learner's language. */
export type AskAiErrorKind =
  | 'invalid-key'
  | 'no-credits'
  | 'rate-limited'
  | 'model-not-found'
  | 'network'
  | 'empty'
  | 'unknown'

/** A failed request, reduced to a kind the UI can localize. `detail` is the provider's message. */
export class AskAiError extends Error {
  readonly kind: AskAiErrorKind
  readonly detail: string | undefined

  constructor(kind: AskAiErrorKind, detail?: string) {
    super(detail ? `${kind}: ${detail}` : kind)
    this.name = 'AskAiError'
    this.kind = kind
    this.detail = detail
  }
}

/** Maps an HTTP status (or an in-stream error code) plus the provider message to an error kind. */
export function classifyFailure(status: number, message?: string): AskAiErrorKind {
  if (status === 401 || status === 403) return 'invalid-key'
  if (status === 402) return 'no-credits'
  if (status === 429) return 'rate-limited'
  if (status === 404) return 'model-not-found'
  if (status === 400 && message && /model/i.test(message)) return 'model-not-found'
  return 'unknown'
}

/** Pulls `error.message` out of an OpenRouter error body; undefined when it is not that shape. */
export function readErrorMessage(body: string): string | undefined {
  try {
    const json: unknown = JSON.parse(body)
    if (typeof json === 'object' && json !== null && 'error' in json) {
      const error = (json as { error: unknown }).error
      if (typeof error === 'object' && error !== null && 'message' in error) {
        const message = (error as { message: unknown }).message
        if (typeof message === 'string') return message
      }
    }
  } catch {
    // Not JSON: no message to show.
  }
  return undefined
}
