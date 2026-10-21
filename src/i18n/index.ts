import { createI18n } from 'vue-i18n'
import { en, vi } from './messages'
import type { MessageSchema } from './messages'
import type { Locale } from './locales'

/**
 * The app's one i18n instance, in Composition API mode. The locale it starts with is set by
 * `useLocale` before the first render, so this only provides the messages.
 */
export const i18n = createI18n<[MessageSchema], Locale, false>({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, vi },
})
