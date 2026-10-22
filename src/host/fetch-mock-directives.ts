/**
 * `// @fetch` directives: canned network responses a Script declares for `fetch` to http(s) URLs.
 * A Run has no real network, so these lines are the whole network; the Oracle recorder serves the
 * same responses to Chrome, so both sides see one network. Self-contained (no imports) so the
 * recorder can load it straight from Node.
 *
 *   // @fetch <url> [<status>] [<latency>ms] [<body...>]
 *
 * Status defaults to 200, latency to 100 ms, body to empty. The body is the rest of the line,
 * served as `application/json` when it parses as JSON, else as `text/plain`.
 */

export interface FetchMock {
  url: string
  status: number
  latencyMs: number
  body: string
  contentType: string
}

export const DEFAULT_MOCK_LATENCY_MS = 100

const DIRECTIVE = /^\s*\/\/\s*@fetch\s+(\S+)(.*)$/

const isJson = (text: string): boolean => {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

/** Every `// @fetch` line of the Script, in order; a later line for the same URL wins at lookup. */
export function parseFetchMocks(script: string): FetchMock[] {
  const mocks: FetchMock[] = []
  for (const line of script.split('\n')) {
    const match = DIRECTIVE.exec(line)
    if (!match) continue
    let rest = match[2]!.trim()
    let status = 200
    let latencyMs = DEFAULT_MOCK_LATENCY_MS
    const statusMatch = /^(\d{3})(?:\s+|$)/.exec(rest)
    if (statusMatch && Number(statusMatch[1]) >= 200 && Number(statusMatch[1]) <= 599) {
      status = Number(statusMatch[1])
      rest = rest.slice(statusMatch[0].length)
    }
    const latencyMatch = /^(\d+(?:\.\d+)?)ms(?:\s+|$)/.exec(rest)
    if (latencyMatch) {
      latencyMs = Number(latencyMatch[1])
      rest = rest.slice(latencyMatch[0].length)
    }
    const body = rest.trim()
    mocks.push({
      url: match[1]!,
      status,
      latencyMs,
      body,
      contentType: body !== '' && isJson(body) ? 'application/json' : 'text/plain',
    })
  }
  return mocks
}

/** Reason phrases Chrome reports as `statusText` for an HTTP/1.1 response. */
export const STATUS_TEXT: Readonly<Record<number, string>> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  418: "I'm a teapot",
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
}
