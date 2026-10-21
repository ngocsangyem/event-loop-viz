<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { cn } from '@/lib/utils'
import type { ModeTab } from './use-app-layout'

/** Phone only: SCRIPT / REPLAY. Replay waits for a Trace, like the rest of the replay. */
defineProps<{ canReplay: boolean }>()
const tab = defineModel<ModeTab>({ required: true })
const { t } = useI18n()

const TABS: { id: ModeTab; label: string }[] = [
  { id: 'script', label: 'modeTabs.script' },
  { id: 'replay', label: 'modeTabs.replay' },
]
</script>

<template>
  <div role="tablist" :aria-label="t('modeTabs.label')" class="border-border grid grid-cols-2 border-b" data-testid="mode-tabs">
    <button
      v-for="item in TABS"
      :key="item.id"
      type="button"
      role="tab"
      :aria-selected="tab === item.id"
      :disabled="item.id === 'replay' && !canReplay"
      :class="
        cn(
          'label-mono h-11 outline-none disabled:opacity-50',
          tab === item.id ? 'text-foreground shadow-[inset_0_-2px_0_var(--foreground)]' : 'text-foreground-2',
        )
      "
      @click="tab = item.id"
    >
      {{ t(item.label) }}
    </button>
  </div>
</template>
