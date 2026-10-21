import { onScopeDispose, shallowRef } from 'vue'
import type { Ref } from 'vue'
import type { Locale } from '@/i18n/locales'
import { buildChatMessages } from './chat-messages'
import { streamChat } from './openrouter-client'
import { AskAiError } from './openrouter-error'
import type { AskAiErrorKind } from './openrouter-error'

export interface ConversationMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
}

export interface AskAiOptions {
  apiKey: Ref<string>
  model: Ref<string>
  locale: Ref<Locale>
  /** Builds the context for the playhead as it is when the question is sent. */
  buildContext: () => string
}

function withoutLastTurn(all: ConversationMessage[]): ConversationMessage[] {
  let lastUser = -1
  all.forEach((m, i) => {
    if (m.role === 'user') lastUser = i
  })
  return lastUser === -1 ? all : all.slice(0, lastUser)
}

/**
 * The conversation with the model: messages, the in-flight request and the last failure.
 * One request at a time; Stop and unmounting abort it, keeping whatever text already arrived.
 */
export function useAskAi(options: AskAiOptions) {
  const messages = shallowRef<ConversationMessage[]>([])
  const streaming = shallowRef(false)
  const error = shallowRef<{ kind: AskAiErrorKind; detail?: string } | null>(null)
  /** Bumps each time an answer finishes, so a live region can announce it. */
  const completed = shallowRef(0)
  let controller: AbortController | null = null
  let nextId = 1
  onScopeDispose(() => controller?.abort())
  let lastQuestion = ''

  function update(id: number, change: (m: ConversationMessage) => ConversationMessage) {
    messages.value = messages.value.map((m) => (m.id === id ? change(m) : m))
  }

  async function send(question: string, dropFailedTurn: boolean) {
    const text = question.trim()
    if (text === '' || streaming.value) return
    if (!options.apiKey.value) {
      error.value = { kind: 'invalid-key' }
      return
    }
    error.value = null
    lastQuestion = text
    // A retry replaces the failed turn (question and any partial answer) instead of stacking a copy.
    const base = dropFailedTurn ? withoutLastTurn(messages.value) : messages.value
    const history = base.map(({ role, content }) => ({ role, content }))
    const answerId = nextId++
    messages.value = [
      ...base,
      { id: nextId++, role: 'user', content: text },
      { id: answerId, role: 'assistant', content: '' },
    ]
    const request = buildChatMessages({
      locale: options.locale.value,
      history,
      question: text,
      context: options.buildContext(),
    })
    const active = new AbortController()
    controller = active
    streaming.value = true
    try {
      await streamChat({
        apiKey: options.apiKey.value,
        model: options.model.value,
        messages: request,
        signal: active.signal,
        onDelta: (delta) => update(answerId, (m) => ({ ...m, content: m.content + delta })),
      })
      completed.value += 1
    } catch (caught) {
      if (!active.signal.aborted) {
        error.value =
          caught instanceof AskAiError
            ? { kind: caught.kind, detail: caught.detail }
            : { kind: 'unknown' }
      }
    } finally {
      if (controller === active) controller = null
      streaming.value = false
      // A stopped or failed request leaves no empty answer bubble behind.
      messages.value = messages.value.filter((m) => m.id !== answerId || m.content !== '')
    }
  }

  return {
    messages,
    streaming,
    error,
    completed,
    ask: (question: string) => send(question, false),
    /** Sends the failed question again; the failed attempt leaves the conversation. */
    retry: () => send(lastQuestion, true),
    stop: () => controller?.abort(),
    clear() {
      controller?.abort()
      messages.value = []
      error.value = null
    },
    dismissError() {
      error.value = null
    },
  }
}

export type AskAi = ReturnType<typeof useAskAi>
