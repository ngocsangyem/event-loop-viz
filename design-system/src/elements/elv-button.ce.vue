<script setup lang="ts">
/**
 * A control as a mono word (DESIGN.md · Buttons): `primary` is an ink fill with bg text (the one
 * filled control in a row, e.g. PLAY or SAVE); `secondary` is the text-only word; `destructive` is
 * a red outline (CANCEL while recording). The hotkey prints before the word as `[⌘↵]`, the
 * signature move of the system. Hover = hover-row fill; focus = 2px accent outline. No pills,
 * no icon-only controls. `pressed` marks a toggle that is on (ink border + hover-row fill).
 */
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'outline' | 'destructive'
    /** Printed hotkey, e.g. `⌘↵`, `⇧→`, `A`. Hidden from assistive tech (put it in `label`). */
    hotkey?: string
    /** Accessible name when the word alone is not enough, e.g. "Next Tick (Shift →)". */
    label?: string
    disabled?: boolean
    /** Toggle state for outline controls such as ASK AI. */
    pressed?: boolean
    /** `touch` = 44px tall for phone targets; hotkeys are not printed on touch. */
    size?: 'default' | 'touch'
    type?: 'button' | 'submit'
  }>(),
  { variant: 'secondary', hotkey: undefined, label: undefined, size: 'default', type: 'button' },
)
</script>

<template>
  <button
    class="btn"
    :type="type"
    :data-variant="variant"
    :data-size="size"
    :disabled="disabled"
    :aria-label="label"
    :aria-pressed="variant === 'outline' ? pressed : undefined"
  >
    <span v-if="hotkey && size !== 'touch'" class="key" aria-hidden="true">[{{ hotkey }}]</span>
    <span class="word"><slot /></span>
  </button>
</template>

<style>
:host {
  display: inline-flex;
  vertical-align: middle;
}
:host([hidden]) {
  display: none;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  height: 28px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--color-ink);
  font: 500 var(--text-label) / 16px var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-out),
    border-color var(--motion-fast) var(--ease-out);
}
.btn[data-size='touch'] {
  height: 44px;
  min-width: 44px;
  padding: 0 14px;
}
.btn:hover:not(:disabled) {
  background: var(--color-hover-row);
}
.btn:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.btn[data-variant='primary'] {
  background: var(--primary);
  color: var(--primary-foreground);
}
.btn[data-variant='primary']:hover:not(:disabled) {
  background: color-mix(in srgb, var(--primary) 86%, transparent);
}
.btn[data-variant='outline'] {
  border-color: var(--color-line);
}
.btn[data-variant='outline'][aria-pressed='true'] {
  border-color: var(--color-ink);
  background: var(--color-hover-row);
}
.btn[data-variant='destructive'] {
  border-color: var(--destructive);
  color: var(--destructive);
}
.btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.key {
  color: var(--color-ink-3);
  font-weight: 400;
}
.btn[data-variant='primary'] .key {
  color: color-mix(in srgb, var(--primary-foreground) 70%, transparent);
}
.btn[data-variant='destructive'] .key {
  color: inherit;
}
</style>
