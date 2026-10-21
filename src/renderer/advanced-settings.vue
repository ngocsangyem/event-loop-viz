<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { DEFAULT_BUDGETS, DEFAULT_NODE_COST_US } from '../trace/default-budgets'
import { updateSetting } from './run-settings-model'
import type { EditableRunSettings, SettingField } from './run-settings-model'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/** Budgets and the per-node cost; blank fields use the defaults shown as placeholders. */
const settings = defineModel<EditableRunSettings>({ required: true })

const { t } = useI18n()

const FIELDS: { field: SettingField; placeholder: number }[] = [
  { field: 'nodes', placeholder: DEFAULT_BUDGETS.nodes },
  { field: 'tasks', placeholder: DEFAULT_BUDGETS.tasks },
  { field: 'virtualMs', placeholder: DEFAULT_BUDGETS.virtualMs },
  { field: 'events', placeholder: DEFAULT_BUDGETS.events },
  { field: 'nodeCostUs', placeholder: DEFAULT_NODE_COST_US },
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
      <!-- A word, not a box: the underline is what marks it as a control. -->
      <Button
        variant="ghost"
        size="sm"
        class="text-foreground px-0 underline underline-offset-[3px] hover:bg-transparent"
      >
        {{ t('settings.button') }}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-80 gap-3 p-4" data-testid="advanced-settings">
      <p class="text-foreground-2 text-[13px] leading-5">
        {{ t('settings.hint') }}
      </p>
      <div class="grid gap-2">
        <div v-for="item in FIELDS" :key="item.field" class="grid grid-cols-[1fr_7rem] items-center gap-2">
          <Label :for="`setting-${item.field}`" class="text-xs">{{ t(`settings.field.${item.field}`) }}</Label>
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
