/** The languages the app is written in. English is the fallback for anything missing. */
export const LOCALES = ['en', 'vi'] as const
export type Locale = (typeof LOCALES)[number]

/** Each language named in itself, as a language picker shows it. */
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', vi: 'Tiếng Việt' }

/** The browser's preferred language when the app has it, English otherwise. */
export function preferredLocale(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0]
    const match = LOCALES.find((locale) => locale === base)
    if (match) return match
  }
  return 'en'
}
