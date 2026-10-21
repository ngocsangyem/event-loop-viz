import { computed } from 'vue'
import { useStoredChoice } from './use-stored-choice'

/** Whether a finished Run starts playing by itself. On unless the viewer turned it off. */
export function useAutoplayPreference() {
  const stored = useStoredChoice('elv-autoplay', ['on', 'off'] as const, 'on')
  return computed({
    get: () => stored.value === 'on',
    set: (on: boolean) => (stored.value = on ? 'on' : 'off'),
  })
}
