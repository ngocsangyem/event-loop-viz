import { ref, watch } from 'vue'

const STORAGE_KEY = 'elv-autoplay'

/** Whether a finished Run starts playing by itself. On unless the viewer turned it off. */
export function useAutoplayPreference() {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage can be blocked; the default applies.
  }
  const autoplay = ref(stored !== 'off')
  watch(autoplay, (on) => {
    try {
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
    } catch {
      // Not remembering the choice is harmless.
    }
  })
  return autoplay
}
