<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { cn } from '@/lib/utils'
import { CHIP_TRAVEL_KEY } from './chip-travel-keys'
import { STEP_FOCUS_KEY } from './step-focus-keys'
import CallbackChip from './callback-chip.vue'
import type { ChipModel } from './callback-chip-model'

export interface QueueItem {
  id: string
  label: string
  detail?: string
  /** The callback this entry stands for; drawn instead of `label`, which stays as the fallback. */
  chip?: ChipModel
  /** The entry that is running now; drawn highlighted. */
  active?: boolean
}

/**
 * A vertical list of queue or stack entries with an empty state. Shared by every queue panel.
 * Entries animate in, out and between places (panel-motion.css), so a step reads as movement.
 */
defineProps<{ items: readonly QueueItem[]; empty: string; testid: string }>()

// Outside the app (tests, stories) there is no travel layer and rows animate on their own.
const travel = inject(CHIP_TRAVEL_KEY, null)
/** A name with no styles: after a jump rows appear and vanish at once instead of fading in en masse. */
const transitionName = computed(() => (travel?.snapping.value ? 'queue-snap' : 'queue-item'))
// The NEW tag is drawn from the attribute (panel-skin.css), so it never joins the row's text.
const focus = inject(STEP_FOCUS_KEY, null)
const { t } = useI18n()
const newTag = (id: string) => (focus?.value.newIds.has(id) ? t('panels.newItem') : undefined)
</script>

<template>
  <div class="relative">
    <p v-if="items.length === 0" class="meta-mono py-2 text-center">{{ empty }}</p>
    <TransitionGroup tag="ol" :name="transitionName" :data-testid="testid" class="relative flex flex-col gap-1.5">
      <li
        v-for="item in items"
        :key="item.id"
        :data-id="item.id"
        :aria-current="item.active ? 'step' : undefined"
        :data-new="newTag(item.id)"
        :class="
          cn(
            'queue-row flex w-full items-center justify-between gap-2 px-2.5 py-1.5 font-mono text-[12.5px] leading-[18px]',
            item.active && 'queue-item-active text-foreground',
            travel?.arriving.value.has(item.id) && 'chip-arriving',
          )
        "
      >
        <CallbackChip v-if="item.chip" :chip="item.chip" />
        <span v-else class="truncate">{{ item.label }}</span>
        <!-- The running row's tag is drawn in the pane's hue, which keeps 4.5:1 on its soft fill. -->
        <span v-if="item.detail" :class="cn('label-mono shrink-0 text-[11px]', item.active ? 'queue-row-tag' : 'text-muted-foreground')">{{ item.detail }}</span>
      </li>
    </TransitionGroup>
  </div>
</template>
