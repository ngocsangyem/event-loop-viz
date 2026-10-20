<script setup lang="ts">
import { useTemplateRef } from 'vue'

type TabId = 'console' | 'events'
const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'console', label: 'Console' },
  { id: 'events', label: 'Events' },
]

/** The selected tab. Both panels stay mounted so list filters and scroll survive a switch. */
const active = defineModel<TabId>({ default: 'events' })
const tabButtons = useTemplateRef<HTMLButtonElement[]>('tabButtons')

/** Automatic activation: arrow keys move focus and select, wrapping at the ends (ARIA tabs pattern). */
function onKeydown(event: KeyboardEvent, index: number) {
  const last = TABS.length - 1
  const target =
    event.key === 'ArrowRight'
      ? (index + 1) % TABS.length
      : event.key === 'ArrowLeft'
        ? (index + last) % TABS.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? last
            : null
  if (target === null) return
  event.preventDefault()
  // The transport bar owns arrow keys on the window; the tab strip handles them itself.
  event.stopPropagation()
  active.value = TABS[target]!.id
  tabButtons.value?.[target]?.focus()
}
</script>

<template>
  <section class="bottom-panel" aria-label="Run output">
    <div role="tablist" aria-label="Run output" class="bottom-panel-tabs">
      <button
        v-for="(tab, index) in TABS"
        :id="`bottom-tab-${tab.id}`"
        :key="tab.id"
        ref="tabButtons"
        type="button"
        role="tab"
        :data-testid="`tab-${tab.id}`"
        :aria-selected="active === tab.id"
        :aria-controls="`bottom-panel-${tab.id}`"
        :tabindex="active === tab.id ? 0 : -1"
        @click="active = tab.id"
        @keydown="onKeydown($event, index)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div
      v-for="tab in TABS"
      v-show="active === tab.id"
      :id="`bottom-panel-${tab.id}`"
      :key="tab.id"
      role="tabpanel"
      :aria-labelledby="`bottom-tab-${tab.id}`"
      :class="`bottom-panel-${tab.id}`"
    >
      <slot :name="tab.id" />
    </div>
  </section>
</template>

<style scoped>
.bottom-panel-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--anatomy-lo);
  margin-bottom: 12px;
}
.bottom-panel-tabs [role='tab'] {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom-color: transparent;
}
.bottom-panel-tabs [role='tab'][aria-selected='true'] {
  background: var(--anatomy-face);
  border-color: var(--anatomy-blue);
  border-bottom-color: var(--anatomy-face);
}
.bottom-panel-events {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.bottom-panel-events > :deep(*) {
  min-width: 0;
}
@media (max-width: 640px) {
  .bottom-panel-events {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
