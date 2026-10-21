import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'

export type ThemeChoice = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'elv-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readStoredChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    // Storage can be blocked (private mode, sandboxed frames): fall back to the system theme.
    return 'system'
  }
}

/**
 * The colour theme. Two token sets read it: shadcn-vue keys off the `dark` class on <html>,
 * the Scene and editor tokens (theme.css) off `data-theme`. "system" follows the OS setting.
 */
export function useColorTheme() {
  const choice = ref<ThemeChoice>(readStoredChoice())
  const media = window.matchMedia(DARK_QUERY)
  const systemDark = ref(media.matches)
  const onSystemChange = (event: MediaQueryListEvent) => (systemDark.value = event.matches)
  media.addEventListener('change', onSystemChange)
  onBeforeUnmount(() => media.removeEventListener('change', onSystemChange))

  const dark = computed(() => (choice.value === 'system' ? systemDark.value : choice.value === 'dark'))

  watchEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', dark.value)
    root.dataset.theme = dark.value ? 'dark' : 'light'
    try {
      if (choice.value === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, choice.value)
    } catch {
      // Not persisting the choice is harmless.
    }
  })

  return { choice }
}
