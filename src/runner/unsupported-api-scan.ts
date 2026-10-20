/**
 * Pre-run static scan: lists the Unsupported APIs a Script references.
 *
 * A small lexer (not a parser) is enough because the scan only feeds a notice;
 * the runtime stubs are what actually fail. Comments, string/template text,
 * regex literals and `.property` names are skipped. Shadowing by a local
 * binding is not tracked, so the list may over-report but never under-reports.
 */

/** Bare global names whose any reference is unsupported. */
const UNSUPPORTED_GLOBALS = new Set([
  'fetch',
  'document',
  'window',
  'requestAnimationFrame',
  'addEventListener',
  'postMessage',
  'FinalizationRegistry',
  'WeakRef',
  'SharedArrayBuffer',
])

const IDENT_START = /[A-Za-z_$]/
const IDENT_PART = /[A-Za-z0-9_$]/
/** After these keywords a `/` starts a regex rather than a division. */
const REGEX_AFTER_KEYWORD = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else', 'do'])

type Token = { kind: 'ident' | 'punct'; text: string }

/** Splits code into identifiers and single punctuators, dropping literals and comments. */
function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  // Stack of template-literal `${` brace depths, so the matching `}` resumes template text.
  const templateBraceStack: number[] = []
  let braceDepth = 0
  let i = 0

  const skipString = (quote: string) => {
    i++
    while (i < src.length && src[i] !== quote) i += src[i] === '\\' ? 2 : 1
    i++
  }
  /** Consumes template text up to the closing backtick or the next `${`; true if `${` opened. */
  const skipTemplateText = (): boolean => {
    while (i < src.length) {
      const c = src[i]
      if (c === '\\') i += 2
      else if (c === '`') {
        i++
        return false
      } else if (c === '$' && src[i + 1] === '{') {
        i += 2
        return true
      } else i++
    }
    return false
  }
  const lastToken = () => tokens[tokens.length - 1]
  const regexAllowed = () => {
    const last = lastToken()
    if (!last) return true
    if (last.kind === 'ident') return REGEX_AFTER_KEYWORD.has(last.text)
    return !/^[)\]}]$/.test(last.text)
  }
  const skipRegex = () => {
    i++
    let inClass = false
    while (i < src.length && src[i] !== '\n') {
      const c = src[i]
      if (c === '\\') i++
      else if (c === '[') inClass = true
      else if (c === ']') inClass = false
      else if (c === '/' && !inClass) break
      i++
    }
    i++
    while (i < src.length && IDENT_PART.test(src[i]!)) i++
  }

  while (i < src.length) {
    const c = src[i]!
    const next = src[i + 1]
    if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++
    } else if (c === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2)
      i = end === -1 ? src.length : end + 2
    } else if (c === '"' || c === "'") {
      skipString(c)
    } else if (c === '`') {
      i++
      if (skipTemplateText()) templateBraceStack.push(braceDepth)
    } else if (c === '/' && regexAllowed()) {
      skipRegex()
    } else if (IDENT_START.test(c)) {
      const start = i
      while (i < src.length && IDENT_PART.test(src[i]!)) i++
      tokens.push({ kind: 'ident', text: src.slice(start, i) })
    } else if (/\s/.test(c)) {
      i++
    } else {
      if (c === '{') braceDepth++
      if (c === '}') {
        braceDepth--
        if (templateBraceStack[templateBraceStack.length - 1] === braceDepth) {
          templateBraceStack.pop()
          i++
          if (skipTemplateText()) templateBraceStack.push(braceDepth)
          continue
        }
      }
      tokens.push({ kind: 'punct', text: c })
      i++
    }
  }
  return tokens
}

/** Unsupported APIs the Script references, deduplicated, in order of first use. */
export function scanUnsupportedApis(script: string): string[] {
  const tokens = tokenize(script)
  const found: string[] = []
  const add = (api: string) => {
    if (!found.includes(api)) found.push(api)
  }
  tokens.forEach((token, index) => {
    if (token.kind !== 'ident') return
    const previous = tokens[index - 1]
    if (previous?.text === '.') return
    // `{ window: 1 }` and `class { fetch() {} }`-style keys are not references.
    if (UNSUPPORTED_GLOBALS.has(token.text) && tokens[index + 1]?.text !== ':') add(token.text)
    if (
      token.text === 'Atomics' &&
      tokens[index + 1]?.text === '.' &&
      tokens[index + 2]?.text === 'wait'
    ) {
      add('Atomics.wait')
    }
  })
  return found
}
