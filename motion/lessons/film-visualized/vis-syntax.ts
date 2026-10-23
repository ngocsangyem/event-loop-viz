// Syntax colours of the visualized style: keywords and arrows pink, called names green, strings
// yellow, numbers purple, the rest near-white. Returns HTML spans for one line of code.
const KEYWORDS = new Set(
  'const let var function async await return new if else while for of in true false null undefined this typeof instanceof yield import export default class try catch'.split(' '),
)

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function visHighlight(text: string): string {
  const out: string[] = []
  const re = /(\/\/.*$)|('(?:[^'\\]|\\.)*'?|"(?:[^"\\]|\\.)*"?|`[^`]*`?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(=>)|(\s+)|(.)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const [tok, comment, str, num, ident, arrow] = m
    if (comment) out.push(`<span class="v-comment">${esc(tok)}</span>`)
    else if (str) out.push(`<span class="v-string">${esc(tok)}</span>`)
    else if (num) out.push(`<span class="v-number">${esc(tok)}</span>`)
    else if (arrow) out.push(`<span class="v-keyword">${esc(tok)}</span>`)
    else if (ident) {
      const called = /^\s*\(/.test(text.slice(re.lastIndex))
      const cls = KEYWORDS.has(tok) ? 'v-keyword' : called ? 'v-call' : 'v-ident'
      out.push(`<span class="${cls}">${esc(tok)}</span>`)
    } else out.push(esc(tok))
  }
  return out.join('')
}
