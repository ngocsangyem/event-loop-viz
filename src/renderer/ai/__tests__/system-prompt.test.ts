import { describe, expect, it } from 'vitest'
import { buildChatMessages, MAX_HISTORY_TURNS } from '../chat-messages'
import { buildSystemPrompt } from '../system-prompt'

describe('buildSystemPrompt', () => {
  it('asks for English or Vietnamese by locale', () => {
    expect(buildSystemPrompt('en')).toContain('Answer in English.')
    expect(buildSystemPrompt('en')).not.toContain('Vietnamese')
    const vi = buildSystemPrompt('vi')
    expect(vi).toContain('Answer in Vietnamese')
    expect(vi).toContain('call stack, microtask, promise, callback')
  })

  it('carries the grounding and writing rules', () => {
    const prompt = buildSystemPrompt('en')
    for (const phrase of [
      'Base every claim on that context',
      'Do not invent APIs',
      'delve',
      'tapestry',
      "It's not just X, it's Y",
      'Great question',
      'I hope this helps',
      'No emoji',
      'em dashes',
    ]) {
      expect(prompt).toContain(phrase)
    }
  })

  it('asks for a tour of the whole Run with stops that name Trace events', () => {
    const prompt = buildSystemPrompt('vi')
    expect(prompt).toContain('Explain how the whole Script runs from start to end')
    expect(prompt).toContain('"## #<event number> <short title>"')
    expect(prompt).toContain('Use only event numbers listed in the Trace')
  })

  it('stays compact', () => {
    expect(buildSystemPrompt('vi').length).toBeLessThan(4500)
  })
})

describe('buildChatMessages', () => {
  it('puts the fresh context on the new question and keeps older turns as plain text', () => {
    const messages = buildChatMessages({
      locale: 'en',
      history: [{ role: 'user', content: 'q1' }, { role: 'assistant', content: 'a1' }],
      question: 'q2',
      context: 'CTX',
    })
    expect(messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user'])
    expect(messages[1]!.content).toBe('q1')
    expect(messages[3]!.content).toContain('<trace_context>\nCTX\n</trace_context>')
    expect(messages[3]!.content).toContain('Question: q2')
  })

  it('keeps only the last turns and drops empty messages', () => {
    const history = Array.from({ length: 40 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `m${i}`,
    }))
    history.push({ role: 'assistant', content: '  ' })
    const messages = buildChatMessages({ locale: 'en', history, question: 'q', context: 'c' })
    expect(messages).toHaveLength(1 + MAX_HISTORY_TURNS * 2 + 1)
    expect(messages[1]!.content).toBe('m20')
  })
})
