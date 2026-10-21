import { nextTick, shallowRef } from 'vue'
import type { Ref } from 'vue'

interface SendOptions {
  hasKey: () => boolean
  hasTrace: () => boolean
  ensureRun: () => Promise<void>
  ask: (question: string) => unknown
  openSettings: () => void
  announce: (message: string) => void
  preparingMessage: () => string
}

/**
 * Sending a question: no key opens Settings; no Trace yet runs the Script first, because
 * without events the AI has nothing to stop at. `preparing` is true during that Run.
 */
export function useAskAiSend(options: SendOptions): { preparing: Ref<boolean>; send: (question: string) => Promise<void> } {
  const preparing = shallowRef(false)

  async function send(question: string) {
    options.announce('')
    if (!options.hasKey()) {
      options.openSettings()
      return
    }
    if (!options.hasTrace() && !preparing.value) {
      preparing.value = true
      options.announce(options.preparingMessage())
      try {
        await options.ensureRun()
        await nextTick()
      } finally {
        preparing.value = false
      }
    }
    void options.ask(question)
  }

  return { preparing, send }
}
