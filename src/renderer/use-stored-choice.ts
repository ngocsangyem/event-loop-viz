import { shallowRef, watch } from 'vue'
import type { ShallowRef } from 'vue'

/**
 * A per-browser choice from a fixed set, remembered in localStorage. Storage can be blocked
 * (private mode, sandboxed frames); the choice then still works for the session, unsaved.
 */
export function useStoredChoice<T extends string>(
  key: string,
  choices: readonly T[],
  fallback: T,
): ShallowRef<T> {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(key)
  } catch {
    // Unreadable storage: start from the fallback.
  }
  const initial: T = choices.find((c) => c === stored) ?? fallback
  const choice = shallowRef(initial) as ShallowRef<T>
  watch(choice, (value) => {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Not remembering the choice is harmless.
    }
  })
  return choice
}
