import { en, vi } from '../../../src/i18n/messages'
import type { ChipLabels } from '../../../src/renderer/panels/callback-chip-model'
import type { Lang } from '../lesson-types'

type Messages = typeof en
const MESSAGES: Record<Lang, Messages> = { en, vi }

/** vue-i18n lookup for Node: dotted key, `{name}` placeholders. Throws on a missing key so a typo cannot ship. */
export function translator(lang: Lang) {
  return (key: string, params: Record<string, unknown> = {}): string => {
    const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], MESSAGES[lang])
    if (typeof value !== 'string') throw new Error(`missing message ${lang}:${key}`)
    return value.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''))
  }
}

export function chipLabelsFor(lang: Lang): ChipLabels {
  const t = translator(lang)
  return {
    awaitResume: (fn) => t('panels.chip.awaitResume', { fn }),
    anonymous: t('panels.chip.anonymous'),
    line: (line) => t('panels.chip.line', { line }),
    taskSource: (source) => t(`panels.taskSource.${source}`),
    jobKind: (kind) => t(`panels.jobKind.${kind}`),
    webApi: (api) => t(`panels.webApis.op.${api}`),
  }
}

/** Words only the video needs (the app has no screen for them). */
const LESSON_WORDS: Record<Lang, Record<string, string>> = {
  en: {
    script: 'Script (global)',
    resumed: '{fn} resumes',
    question: 'What does the console print, and in what order?',
    code: 'Code',
    output: 'Output order',
    takeaways: 'Remember',
    model: 'Mental model',
    why: 'Why this order?',
    parked: 'at await',
    clock: 'clock',
    empty: 'empty',
    phaseRender: 'Running an animation frame callback',
    builtin: 'built-in',
    callback: 'callback',
  },
  vi: {
    script: 'Script (toàn cục)',
    resumed: '{fn} chạy tiếp',
    question: 'Console sẽ in ra gì, theo thứ tự nào?',
    code: 'Code',
    output: 'Thứ tự output',
    takeaways: 'Cần nhớ',
    model: 'Mô hình tư duy',
    why: 'Vì sao lại theo thứ tự này?',
    parked: 'dừng ở await',
    clock: 'đồng hồ',
    empty: 'trống',
    phaseRender: 'Đang chạy callback của animation frame',
    builtin: 'built-in',
    callback: 'callback',
  },
}

/** Every label the film draws, in one language. */
export function filmLabelsFor(lang: Lang): Record<string, string> {
  const t = translator(lang)
  return {
    ...LESSON_WORDS[lang],
    callStack: t('panels.callStack.title'),
    webApis: t('panels.webApis.title'),
    microtasks: t('panels.microtaskQueue.title'),
    tasks: t('panels.taskQueue.title'),
    loop: t('panels.eventLoop.title'),
    console: t('console.title'),
    loopTask: t('panels.eventLoop.task'),
    loopMicrotasks: t('panels.eventLoop.microtasks'),
    phaseIdle: t('panels.eventLoop.idle'),
    phaseTask: t('panels.eventLoop.running'),
    phaseMicrotasks: t('panels.eventLoop.draining'),
    phaseHalted: t('panels.eventLoop.halted'),
  }
}

export function lessonWord(lang: Lang, key: string, params: Record<string, string> = {}): string {
  return (LESSON_WORDS[lang][key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => params[name] ?? '')
}
