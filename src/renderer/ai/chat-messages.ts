import type { Locale } from '@/i18n/locales'
import type { ChatMessage } from './openrouter-client'
import { buildSystemPrompt } from './system-prompt'

/** Earlier turns kept in the request (one turn = a question and its answer). */
export const MAX_HISTORY_TURNS = 10

export interface Turn {
  role: 'user' | 'assistant'
  content: string
}

/**
 * The request messages: system prompt, the last turns of the conversation, then the new
 * question with the context for the current playhead. Older questions keep only their text, so
 * stale step context never competes with the fresh one.
 */
export function buildChatMessages(args: {
  locale: Locale
  history: readonly Turn[]
  question: string
  context: string
}): ChatMessage[] {
  const history = args.history
    .filter((turn) => turn.content.trim() !== '')
    .slice(-MAX_HISTORY_TURNS * 2)
  return [
    { role: 'system', content: buildSystemPrompt(args.locale) },
    ...history,
    {
      role: 'user',
      content: `<trace_context>\n${args.context}\n</trace_context>\n\nQuestion: ${args.question}`,
    },
  ]
}
