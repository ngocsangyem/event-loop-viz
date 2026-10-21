import { computed, watchEffect } from 'vue'
import { useStoredChoice } from './use-stored-choice'

export type ThemeChoice = 'light' | 'dark'

const THEMES: readonly ThemeChoice[] = ['light', 'dark']
const STORAGE_KEY = 'elv-theme'

/**
 * Older builds also stored "system". The two-state toggle has no such value, so a stored
 * "system" becomes the OS setting once (and is rewritten), and anything else unreadable is dark.
 */
function migratedFallback(): ThemeChoice {
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'system') {
      const os: ThemeChoice = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      localStorage.setItem(STORAGE_KEY, os)
      return os
    }
  } catch {
    // Unreadable storage: fall through to the default.
  }
  return 'dark'
}

/**
 * The colour theme, DARK or LIGHT (dark by default). Two token sets read it: shadcn-vue keys
 * off the `dark` class on <html>, the Scene and editor tokens (theme.css) off `data-theme`.
 */
export function useColorTheme() {
  const choice = useStoredChoice<ThemeChoice>(STORAGE_KEY, THEMES, migratedFallback())
  const dark = computed(() => choice.value === 'dark')

  watchEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', dark.value)
    root.dataset.theme = dark.value ? 'dark' : 'light'
  })

  function toggle() {
    choice.value = dark.value ? 'light' : 'dark'
  }

  return { choice, toggle }
}
