import { watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { LOCALES, preferredLocale } from '@/i18n/locales'
import type { Locale } from '@/i18n/locales'
import { useStoredChoice } from './use-stored-choice'

/**
 * The UI language, remembered per browser. A first visit follows the browser's languages.
 * Keeps vue-i18n and `<html lang>` in step, so screen readers pronounce the right language.
 */
export function useLocale() {
  const choice = useStoredChoice<Locale>('elv-locale', LOCALES, preferredLocale(navigator.languages ?? []))
  const { locale } = useI18n()
  watchEffect(() => {
    locale.value = choice.value
    document.documentElement.lang = choice.value
  })
  return choice
}
