<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * A setting toggle rendered as a word (DESIGN.md · Components → Switch): the mono label followed by
 * an `ON` / `OFF` state word, e.g. `AUTO-PLAY ON`, `SHOW ALL OFF`, `[K]KEYS ON`. The state word is
 * ink when on and ink-3 when off, so state never relies on colour alone. The label is the default
 * slot. Space or Enter toggles; `change` carries the new boolean in `event.detail[0]`.
 */
const props = withDefaults(
  defineProps<{
    checked?: boolean
    /** Printed hotkey, e.g. `K`; shown as `[K]` before the label. */
    hotkey?: string
    /** Accessible name when the slot word alone is not enough. */
    label?: string
    disabled?: boolean
  }>(),
  { checked: false, hotkey: undefined, label: undefined },
)
const emit = defineEmits<{ change: [checked: boolean] }>()

// Uncontrolled-friendly: the element flips its own state, and follows `checked` when the host sets it.
const on = ref(props.checked)
watch(() => props.checked, (value) => (on.value = value))

function toggle() {
  if (props.disabled) return
  on.value = !on.value
  emit('change', on.value)
}
</script>

<template>
  <button
    class="switch"
    type="button"
    role="switch"
    :aria-checked="on"
    :aria-label="label"
    :disabled="disabled"
    @click="toggle"
  >
    <span v-if="hotkey" class="key" aria-hidden="true">[{{ hotkey }}]</span>
    <span class="word"><slot /></span>
    <span class="state" :data-on="on">{{ on ? 'ON' : 'OFF' }}</span>
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
.switch {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-ink-2);
  font: 500 var(--text-label) / 16px var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out);
}
.switch:hover:not(:disabled) {
  background: var(--color-hover-row);
}
.switch:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.switch:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.key {
  color: var(--color-ink-3);
  font-weight: 400;
}
.state {
  color: var(--color-ink-3);
}
.state[data-on='true'] {
  color: var(--color-ink);
}
</style>
