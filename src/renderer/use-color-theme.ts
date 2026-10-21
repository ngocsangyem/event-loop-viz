import { computed, onScopeDispose, shallowRef, watchEffect } from 'vue'
import { useStoredChoice } from './use-stored-choice'

export type ThemeChoice = 'system' | 'light' | 'dark'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * The colour theme. Two token sets read it: shadcn-vue keys off the `dark` class on <html>,
 * the Scene and editor tokens (theme.css) off `data-theme`. "system" follows the OS setting.
 */
export function useColorTheme() {
  const choice = useStoredChoice<ThemeChoice>('elv-theme', ['system', 'light', 'dark'], 'system')
  const media = window.matchMedia(DARK_QUERY)
  const systemDark = shallowRef(media.matches)
  const onSystemChange = (event: MediaQueryListEvent) => (systemDark.value = event.matches)
  media.addEventListener('change', onSystemChange)
  onScopeDispose(() => media.removeEventListener('change', onSystemChange))

  const dark = computed(() => (choice.value === 'system' ? systemDark.value : choice.value === 'dark'))

  watchEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', dark.value)
    root.dataset.theme = dark.value ? 'dark' : 'light'
  })

  return { choice }
}
