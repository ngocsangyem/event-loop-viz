import { DEFAULT_BUDGETS } from '../trace/default-budgets'
import type { HaltReason, TraceBudgets } from '../trace/trace-event'

/** The Run settings the user can change; mirrors what a share link carries. */
export interface EditableRunSettings {
  budgets?: Partial<TraceBudgets>
  nodeCostUs?: number
  randomSeed?: number
}

export type SettingField = keyof TraceBudgets | 'nodeCostUs'

/**
 * Returns new settings with `field` set from the raw input text. Blank, non-numeric or
 * non-positive input removes the override, so the default applies. Budgets are whole numbers.
 */
export function updateSetting(
  settings: EditableRunSettings,
  field: SettingField,
  raw: string,
): EditableRunSettings {
  const value = raw.trim() === '' ? NaN : Number(raw)
  const valid =
    Number.isFinite(value) && value > 0 && (field === 'nodeCostUs' || Number.isInteger(value))
  if (field === 'nodeCostUs') {
    const { nodeCostUs: _dropped, ...rest } = settings
    return valid ? { ...rest, nodeCostUs: value } : rest
  }
  const { [field]: _dropped, ...budgets } = settings.budgets ?? {}
  const { budgets: _oldBudgets, ...rest } = settings
  const nextBudgets = valid ? { ...budgets, [field]: value } : budgets
  return Object.keys(nextBudgets).length > 0 ? { ...rest, budgets: nextBudgets } : rest
}

/** The Budgets the next Run will use: the user's overrides over the defaults, virtual time in seconds. */
export function budgetSummary(settings: EditableRunSettings): { tasks: number; events: number; seconds: number } {
  const budgets = { ...DEFAULT_BUDGETS, ...settings.budgets }
  return { tasks: budgets.tasks, events: budgets.events, seconds: budgets.virtualMs / 1000 }
}

/** The slice of vue-i18n's `t` the Halt message needs, so the model stays free of Vue. */
type Translate = (key: string, named?: Record<string, unknown>) => string

/**
 * The sentence for the Halt banner in the given language; null when the Run ended on its own.
 * The limit is grouped the way that language writes numbers.
 */
export function haltMessage(
  reason: HaltReason,
  limit: number | undefined,
  t: Translate,
  locale: string,
): string | null {
  if (reason === 'natural') return null
  const name = t(`halt.name.${reason}`)
  if (limit === undefined) return t('halt.noLimit', { name })
  return t('halt.withLimit', { name, limit: limit.toLocaleString(locale), unit: t(`halt.unit.${reason}`) })
}
