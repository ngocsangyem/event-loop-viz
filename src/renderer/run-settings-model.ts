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

const BUDGET_NAMES: Record<Exclude<HaltReason, 'natural'>, { name: string; unit: string }> = {
  nodes: { name: 'node', unit: 'nodes' },
  tasks: { name: 'Task', unit: 'Tasks' },
  'virtual-time': { name: 'virtual time', unit: 'ms' },
  events: { name: 'event', unit: 'events' },
}

/** The sentence for the Halt banner; null when the Run ended on its own. */
export function haltMessage(reason: HaltReason, limit?: number): string | null {
  if (reason === 'natural') return null
  const { name, unit } = BUDGET_NAMES[reason]
  const amount = limit === undefined ? '' : ` (${limit.toLocaleString('en-US')} ${unit})`
  return `Halted: the ${name} Budget${amount} was exceeded.`
}
