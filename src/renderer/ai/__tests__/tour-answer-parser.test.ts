import { describe, expect, it } from 'vitest'
import { parseTourAnswer } from '../tour-answer-parser'

const identity = (seq: number) => seq

describe('parseTourAnswer', () => {
  it('splits the big picture, the stops and the summary', () => {
    const text = [
      'It prints `sync`, then `job`, then `timer`.',
      '',
      '## #3 The Script starts',
      'Line 1 runs.',
      '## #9 The promise Job runs',
      'The microtask queue drains.',
      '',
      '## Summary',
      'Jobs run before the next Task.',
    ].join('\n')
    expect(parseTourAnswer(text, identity)).toEqual({
      intro: 'It prints `sync`, then `job`, then `timer`.',
      stops: [
        { seq: 3, title: 'The Script starts', body: 'Line 1 runs.' },
        { seq: 9, title: 'The promise Job runs', body: 'The microtask queue drains.' },
      ],
      outro: 'Jobs run before the next Task.',
    })
  })

  it('accepts the heading variants models tend to write', () => {
    const text = ['### #4: Colon', '## **#5** Bold', '## #6. Dot', '#### #7 — Dash'].join('\n')
    expect(parseTourAnswer(text, identity).stops.map((s) => [s.seq, s.title])).toEqual([
      [4, 'Colon'], [5, 'Bold'], [6, 'Dot'], [7, 'Dash'],
    ])
  })

  it('also reads the stop lines models write when they drift from the format', () => {
    const text = [
      '### Step #4: Labelled',
      '## Bước #5 — Vietnamese label',
      '**#6 — Bold line**',
      '1. **#7** Numbered bold',
      '- **#8**: Bullet bold',
    ].join('\n')
    expect(parseTourAnswer(text, identity).stops.map((s) => [s.seq, s.title])).toEqual([
      [4, 'Labelled'], [5, 'Vietnamese label'], [6, 'Bold line'], [7, 'Numbered bold'], [8, 'Bullet bold'],
    ])
  })

  it('drops parenthesized event numbers from prose but not from code', () => {
    const out = parseTourAnswer('It resolves (#20, #21) at once (#7).\n## #3 Title (#3)\nSee `x(#1)` here (#4 và #5).', identity)
    expect(out.intro).toBe('It resolves at once.')
    expect(out.stops).toEqual([{ seq: 3, title: 'Title', body: 'See `x(#1)` here.' }])
  })

  it('keeps a non-summary heading after the stops as a bold line', () => {
    expect(parseTourAnswer('## #3 A\na\n## Tóm lại\nend', identity).outro).toBe('end')
    expect(parseTourAnswer('## #3 A\na\n## Why it matters\nend', identity).outro).toBe('**Why it matters**\nend')
  })

  it('keeps a sentence that merely starts with an event number as text', () => {
    const out = parseTourAnswer('#3 runs before #4.\n- #5 is a Job.', identity)
    expect(out.stops).toEqual([])
  })

  it('moves a stop to the step the replay can show, and keeps text without a Trace', () => {
    const snapped = parseTourAnswer('## #4 Hidden event\nbody', (seq) => seq + 1)
    expect(snapped.stops).toEqual([{ seq: 5, title: 'Hidden event', body: 'body' }])
    const noTrace = parseTourAnswer('## #4 Hidden event\nbody', () => null)
    expect(noTrace).toEqual({ intro: '**#4 Hidden event**\nbody', stops: [], outro: '' })
  })

  it('holds back a heading that is still streaming', () => {
    const partial = parseTourAnswer('Big picture.\n## #2 Start\nbody\n## #1', identity, false)
    expect(partial.stops).toEqual([{ seq: 2, title: 'Start', body: 'body' }])
    expect(partial.intro).toBe('Big picture.')
    const done = parseTourAnswer('## #2 Start\nbody\n## #12 End', identity)
    expect(done.stops.map((s) => s.seq)).toEqual([2, 12])
  })

  it('joins a stop that lands on the same position as the one before it', () => {
    const out = parseTourAnswer('## #4 First\na\n## #5 Second\nb', () => 7)
    expect(out.stops).toEqual([{ seq: 7, title: 'First', body: 'a\n**Second**\nb' }])
  })

  it('leaves a plain answer as intro only', () => {
    expect(parseTourAnswer('Just text.', identity)).toEqual({ intro: 'Just text.', stops: [], outro: '' })
  })
})
