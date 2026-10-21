/** A tiny, safe subset of Markdown. Output is data for templates to interpolate, never HTML. */
export type Inline = { kind: 'text' | 'code' | 'strong'; text: string }
export type Block =
  | { kind: 'paragraph'; inlines: Inline[] }
  | { kind: 'code'; text: string }
  | { kind: 'list'; ordered: boolean; items: Inline[][] }

const INLINE = /`([^`\n]+)`|\*\*([^*\n]+)\*\*/g

export function parseInline(text: string): Inline[] {
  const out: Inline[] = []
  let last = 0
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) out.push({ kind: 'text', text: text.slice(last, match.index) })
    if (match[1] !== undefined) out.push({ kind: 'code', text: match[1] })
    else out.push({ kind: 'strong', text: match[2]! })
    last = match.index + match[0].length
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) })
  return out
}

const BULLET = /^\s*[-*]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/

/** Paragraphs, bullet and numbered lists and fenced code. An unclosed fence (mid-stream) is code. */
export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = []
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  let paragraph: string[] = []
  let list: { ordered: boolean; items: Inline[][] } | null = null
  let code: string[] | null = null

  const flushParagraph = () => {
    if (paragraph.length > 0) blocks.push({ kind: 'paragraph', inlines: parseInline(paragraph.join(' ')) })
    paragraph = []
  }
  const flushList = () => {
    if (list) blocks.push({ kind: 'list', ...list })
    list = null
  }

  for (const line of lines) {
    if (code) {
      if (line.trimStart().startsWith('```')) {
        blocks.push({ kind: 'code', text: code.join('\n') })
        code = null
      } else code.push(line)
      continue
    }
    if (line.trimStart().startsWith('```')) {
      flushParagraph()
      flushList()
      code = []
      continue
    }
    const bullet = BULLET.exec(line)
    const numbered = bullet ? null : NUMBERED.exec(line)
    const item = bullet ?? numbered
    if (item) {
      flushParagraph()
      const ordered = numbered !== null
      if (list && list.ordered !== ordered) flushList()
      list ??= { ordered, items: [] }
      list.items.push(parseInline(item[1]!))
      continue
    }
    if (line.trim() === '') {
      flushParagraph()
      flushList()
      continue
    }
    flushList()
    paragraph.push(line.trim())
  }
  if (code) blocks.push({ kind: 'code', text: code.join('\n') })
  flushParagraph()
  flushList()
  return blocks
}
