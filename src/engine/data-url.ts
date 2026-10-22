/**
 * Fetch Standard "data: URL processor": the MIME type and body bytes of a `data:` URL, or
 * undefined when the URL is malformed (fetch then fails with a network error). Pure, no engine.
 */
export interface DataUrlResource {
  mimeType: string
  body: Uint8Array
}

const ASCII_WHITESPACE = /^[\t\n\f\r ]+|[\t\n\f\r ]+$/g

/** Percent-decodes into bytes; `%` not followed by two hex digits stays as is. */
export function percentDecode(input: string): Uint8Array {
  const bytes = new TextEncoder().encode(input)
  const out: number[] = []
  const hex = (b: number) => (b >= 0x30 && b <= 0x39) || (b >= 0x41 && b <= 0x46) || (b >= 0x61 && b <= 0x66)
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!
    if (b === 0x25 && i + 2 < bytes.length && hex(bytes[i + 1]!) && hex(bytes[i + 2]!)) {
      out.push(parseInt(String.fromCharCode(bytes[i + 1]!, bytes[i + 2]!), 16))
      i += 2
    } else {
      out.push(b)
    }
  }
  return Uint8Array.from(out)
}

/** Infra "forgiving-base64 decode": whitespace is ignored, padding checked; undefined on failure. */
export function forgivingBase64Decode(input: string): Uint8Array | undefined {
  let data = input.replace(/[\t\n\f\r ]/g, '')
  if (data.length % 4 === 0) data = data.replace(/==?$/, '')
  if (data.length % 4 === 1 || /[^A-Za-z0-9+/]/.test(data)) return undefined
  const binary = atob(data.padEnd(Math.ceil(data.length / 4) * 4, '='))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

/** Lower-cases type/subtype and trims; falls back to text/plain;charset=US-ASCII when unparsable. */
function serializeMimeType(input: string): string {
  const [essence = '', ...parameters] = input.split(';')
  const match = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+)\/([!#$%&'*+.^_`|~0-9A-Za-z-]+)$/.exec(essence.trim())
  if (!match) return 'text/plain;charset=US-ASCII'
  const params = parameters
    .map((p) => p.trim())
    .filter((p) => /^[^=\s]+=.+$/.test(p))
    .map((p) => {
      const at = p.indexOf('=')
      return `${p.slice(0, at).toLowerCase()}=${p.slice(at + 1)}`
    })
  return [`${match[1]!.toLowerCase()}/${match[2]!.toLowerCase()}`, ...params].join(';')
}

export function processDataUrl(href: string): DataUrlResource | undefined {
  // The URL without its fragment, minus the leading "data:".
  const input = href.replace(/#.*$/, '').slice('data:'.length)
  const comma = input.indexOf(',')
  if (comma === -1) return undefined
  let mimeType = input.slice(0, comma).replace(ASCII_WHITESPACE, '')
  let body = percentDecode(input.slice(comma + 1))
  const base64 = /;[\t\n\f\r ]*base64[\t\n\f\r ]*$/i.exec(mimeType)
  if (base64) {
    const decoded = forgivingBase64Decode(new TextDecoder('latin1').decode(body))
    if (!decoded) return undefined
    body = decoded
    mimeType = mimeType.slice(0, base64.index)
  }
  if (mimeType.startsWith(';')) mimeType = `text/plain${mimeType}`
  return { mimeType: serializeMimeType(mimeType), body }
}

/** True for a JavaScript MIME type essence (HTML): only those load as module scripts. */
export function isJavaScriptMimeType(mimeType: string): boolean {
  const essence = mimeType.split(';')[0]!.trim().toLowerCase()
  return /^(application\/(x-)?(ecma|java)script|text\/(x-)?(ecma|java)script|text\/javascript1\.[0-5]|text\/jscript|text\/livescript)$/.test(essence)
}
