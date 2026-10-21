import { watchEffect } from 'vue'
import { useStoredChoice } from './use-stored-choice'

/**
 * The header's KEYS ON / OFF switch. It only controls whether hotkeys are printed (a root
 * attribute that style.css reads, so Button `hotkey` and Kbd both hide); the keys keep working.
 */
export function useKeysVisibility() {
  const stored = useStoredChoice('elv-keys', ['on', 'off'] as const, 'on')
  watchEffect(() => {
    document.documentElement.dataset.keys = stored.value
  })
  return {
    stored,
    toggle: () => (stored.value = stored.value === 'on' ? 'off' : 'on'),
  }
}
