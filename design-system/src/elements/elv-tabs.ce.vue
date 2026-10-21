<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { parseListProp } from '../parse-list-prop'

/**
 * Mode and view navigation (DESIGN.md · States → Nav / tabs): mono words, the active one in ink with
 * a 2px inset ink underline, inactive in ink-2. Each item can print a hotkey (`[E]EDIT`) and a run
 * meta (`[R]REPLAY · RUN #3`). Arrow keys move focus and selection (roving tabindex); `change` carries
 * the item id in `event.detail[0]`. `size="touch"` makes 44px full-width equal columns for phones.
 */
export interface TabItem {
  id: string
  label: string
  /** Printed hotkey, e.g. `E`; not printed when size="touch". */
  hotkey?: string
  /** Trailing meta after the word, e.g. `RUN #3`. */
  meta?: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    /** Array (DOM property) or JSON string (attribute) of {@link TabItem}. */
    items?: TabItem[] | string
    /** Id of the active item. */
    value?: string
    /** Accessible name of the tablist, e.g. "Mode". */
    label?: string
    size?: 'default' | 'touch'
  }>(),
  { items: () => [], value: undefined, label: undefined, size: 'default' },
)
const emit = defineEmits<{ change: [id: string] }>()

const list = computed(() => parseListProp<TabItem>(props.items))
const active = ref(props.value ?? list.value[0]?.id)
watch(() => props.value, (id) => (active.value = id))

const root = ref<HTMLElement>()

function select(item: TabItem) {
  if (item.disabled) return
  active.value = item.id
  emit('change', item.id)
}

/** Arrow/Home/End move to the next enabled tab, wrapping, and activate it (automatic activation). */
function onKeydown(event: KeyboardEvent) {
  const enabled = list.value.filter((item) => !item.disabled)
  if (!enabled.length) return
  const at = enabled.findIndex((item) => item.id === active.value)
  let next: number
  if (event.key === 'ArrowRight') next = (at + 1) % enabled.length
  else if (event.key === 'ArrowLeft') next = (at - 1 + enabled.length) % enabled.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = enabled.length - 1
  else return
  event.preventDefault()
  select(enabled[next])
  root.value?.querySelector<HTMLElement>(`[data-id="${CSS.escape(enabled[next].id)}"]`)?.focus()
}
</script>

<template>
  <div ref="root" class="tabs" role="tablist" :aria-label="label" :data-size="size" @keydown="onKeydown">
    <button
      v-for="item in list"
      :key="item.id"
      class="tab"
      type="button"
      role="tab"
      :data-id="item.id"
      :aria-selected="item.id === active"
      :tabindex="item.id === active ? 0 : -1"
      :disabled="item.disabled"
      @click="select(item)"
    >
      <span v-if="item.hotkey && size !== 'touch'" class="key" aria-hidden="true">[{{ item.hotkey }}]</span>
      <span>{{ item.label }}</span>
      <span v-if="item.meta" class="meta">· {{ item.meta }}</span>
    </button>
  </div>
</template>

<style>
:host {
  display: block;
}
:host([hidden]) {
  display: none;
}
.tabs {
  display: flex;
  align-items: stretch;
  gap: 16px;
}
.tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 28px;
  padding: 0 4px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-ink-2);
  font: 500 var(--text-label) / 16px var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
}
.tab:hover:not(:disabled) {
  color: var(--color-ink);
}
.tab[aria-selected='true'] {
  color: var(--color-ink);
  box-shadow: inset 0 -2px 0 var(--color-ink);
}
.tab:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.tab:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.key,
.meta {
  color: var(--color-ink-3);
  font-weight: 400;
}
.tabs[data-size='touch'] {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 0;
  border-bottom: 1px solid var(--color-line);
}
.tabs[data-size='touch'] .tab {
  height: 44px;
}
</style>
