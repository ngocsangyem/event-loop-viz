import { describe, expect, it } from 'vitest'
import { parseMarkdown } from '../markdown-lite'

describe('parseMarkdown', () => {
  it('splits paragraphs and inline code', () => {
    expect(parseMarkdown('Call `a()` first.\n\nThen b.')).toEqual([
      {
        kind: 'paragraph',
        inlines: [
          { kind: 'text', text: 'Call ' },
          { kind: 'code', text: 'a()' },
          { kind: 'text', text: ' first.' },
        ],
      },
      { kind: 'paragraph', inlines: [{ kind: 'text', text: 'Then b.' }] },
    ])
  })

  it('reads bullet and numbered lists', () => {
    const blocks = parseMarkdown('- one\n- two\n\n1. first\n2. second')
    expect(blocks.map((b) => b.kind === 'list' && [b.ordered, b.items.length])).toEqual([
      [false, 2],
      [true, 2],
    ])
  })

  it('reads fenced code and treats an unclosed fence as code', () => {
    expect(parseMarkdown('```js\nlet a = 1\n```\nafter')[0]).toEqual({ kind: 'code', text: 'let a = 1' })
    expect(parseMarkdown('```\nstreaming')).toEqual([{ kind: 'code', text: 'streaming' }])
  })

  it('keeps raw HTML as plain text', () => {
    const [block] = parseMarkdown('<img src=x onerror=alert(1)>')
    expect(block).toEqual({ kind: 'paragraph', inlines: [{ kind: 'text', text: '<img src=x onerror=alert(1)>' }] })
  })
})
