import type { InjectionKey, Ref } from 'vue'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Alert } from './Alert.vue'
export { default as AlertAction } from './AlertAction.vue'
export { default as AlertDescription } from './AlertDescription.vue'
export { default as AlertTitle } from './AlertTitle.vue'

export type AlertTone = 'note' | 'halt' | 'error' | 'syntax' | 'success' | 'prompt'

/** Per tone: the printed glyph, the label colour, and whether the tone is urgent enough for role="alert". */
export const alertTones: Record<AlertTone, { glyph: string, title: string, urgent: boolean }> = {
  note: { glyph: '※', title: 'text-task', urgent: false },
  halt: { glyph: '▲', title: 'text-brand-text', urgent: false },
  error: { glyph: '⚠', title: 'text-error', urgent: true },
  syntax: { glyph: '↯', title: 'text-error', urgent: true },
  success: { glyph: '✓', title: 'text-job', urgent: false },
  prompt: { glyph: '❯', title: 'text-brand-text', urgent: false },
}

/** Lets AlertTitle pick up the glyph and colour of the Alert it sits in. */
export const alertToneKey: InjectionKey<Ref<AlertTone>> = Symbol('alert-tone')

// The rule is an inset shadow, not a border, so the box keeps its size in every tone.
export const alertVariants = cva('grid gap-x-4 gap-y-0.5 border-0 bg-secondary px-3 py-2.5 text-left group/alert relative w-full', {
  variants: {
    tone: {
      note: 'shadow-[inset_2px_0_0_var(--task)]',
      halt: 'shadow-[inset_2px_0_0_var(--brand)]',
      error: 'shadow-[inset_2px_0_0_var(--error)]',
      syntax: 'shadow-[inset_2px_0_0_var(--error)]',
      success: 'shadow-[inset_2px_0_0_var(--job)]',
      prompt: 'shadow-[inset_2px_0_0_var(--brand)]',
    },
  },
  defaultVariants: {
    tone: 'note',
  },
})

/** `default`/`destructive` predate tones and map to note/error. */
export type AlertVariant = 'default' | 'destructive'
export type AlertVariants = VariantProps<typeof alertVariants> & { variant?: AlertVariant }
