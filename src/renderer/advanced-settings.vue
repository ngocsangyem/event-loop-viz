<script setup lang="ts">
import { DEFAULT_BUDGETS, DEFAULT_NODE_COST_US } from '../trace/default-budgets'
import { updateSetting } from './run-settings-model'
import type { EditableRunSettings, SettingField } from './run-settings-model'

/** Budgets and the per-node cost; blank fields use the defaults shown as placeholders. */
const settings = defineModel<EditableRunSettings>({ required: true })

const FIELDS: { field: SettingField; label: string; placeholder: number }[] = [
  { field: 'nodes', label: 'Node Budget', placeholder: DEFAULT_BUDGETS.nodes },
  { field: 'tasks', label: 'Task Budget', placeholder: DEFAULT_BUDGETS.tasks },
  { field: 'virtualMs', label: 'Virtual time Budget (ms)', placeholder: DEFAULT_BUDGETS.virtualMs },
  { field: 'events', label: 'Event Budget', placeholder: DEFAULT_BUDGETS.events },
  { field: 'nodeCostUs', label: 'Cost per node (µs)', placeholder: DEFAULT_NODE_COST_US },
]

const current = (field: SettingField) =>
  (field === 'nodeCostUs' ? settings.value.nodeCostUs : settings.value.budgets?.[field]) ?? ''

function onInput(field: SettingField, event: Event) {
  settings.value = updateSetting(settings.value, field, (event.target as HTMLInputElement).value)
}
</script>

<template>
  <details data-testid="advanced-settings">
    <summary>Advanced settings</summary>
    <p>Changed values apply to the next Run and are saved in the Trace and in share links.</p>
    <label v-for="item in FIELDS" :key="item.field">
      {{ item.label }}
      <input
        type="number"
        min="1"
        :data-testid="`setting-${item.field}`"
        :placeholder="String(item.placeholder)"
        :value="current(item.field)"
        @input="onInput(item.field, $event)"
      />
    </label>
  </details>
</template>
