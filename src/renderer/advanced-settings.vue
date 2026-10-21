<script setup lang="ts">
import { SlidersHorizontalIcon } from '@lucide/vue'
import { DEFAULT_BUDGETS, DEFAULT_NODE_COST_US } from '../trace/default-budgets'
import { updateSetting } from './run-settings-model'
import type { EditableRunSettings, SettingField } from './run-settings-model'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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

function onInput(field: SettingField, value: string | number) {
  settings.value = updateSetting(settings.value, field, String(value))
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="ghost" size="sm">
        <SlidersHorizontalIcon />
        Advanced settings
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-80" data-testid="advanced-settings">
      <p class="text-muted-foreground text-xs">
        Changed values apply to the next Run and are saved in the Trace and in share links.
      </p>
      <div class="grid gap-2">
        <div v-for="item in FIELDS" :key="item.field" class="grid grid-cols-[1fr_7rem] items-center gap-2">
          <Label :for="`setting-${item.field}`" class="text-xs">{{ item.label }}</Label>
          <Input
            :id="`setting-${item.field}`"
            type="number"
            min="1"
            class="h-7"
            :data-testid="`setting-${item.field}`"
            :placeholder="String(item.placeholder)"
            :model-value="current(item.field)"
            @update:model-value="onInput(item.field, $event)"
          />
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
