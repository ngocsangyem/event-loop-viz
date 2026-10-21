<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CHIP_TRAVEL_KEY } from './chip-travel-keys'
import { STEP_FOCUS_KEY } from './step-focus-keys'
import CallbackChip from './callback-chip.vue'
import QueueGhostRow from './queue-ghost-row.vue'
import { useDepartedItems } from './use-departed-items'
import type { ChipModel } from './callback-chip-model'

export interface QueueItem {
  id: string
  /** The entry's name in its hue: `Task #2`, `Job #3`, or a stack frame's function. */
  ref: string
  /** What kind of work it is ("Timer", "Promise reaction"); omitted when the ref says it all. */
  kind?: string
  /** The callback this entry stands for; its code is the second row. */
  chip?: ChipModel
  /** The entry that is running now (TOP); drawn with a hue border. */
  active?: boolean
}

/**
 * A vertical list of queue or stack entries with an empty slot. Shared by every queue panel.
 * Entries animate in, out and between places (panel-motion.css), so a step reads as movement;
 * an entry that just left leaves a dashed ghost below the list for that step.
 */
const props = defineProps<{ items: readonly QueueItem[]; empty: string; testid: string }>()

// Outside the app (tests, stories) there is no travel layer and rows animate on their own.
const travel = inject(CHIP_TRAVEL_KEY, null)
/** A name with no styles: after a jump rows appear and vanish at once instead of fading in en masse. */
const transitionName = computed(() => (travel?.snapping.value ? 'queue-snap' : 'queue-item'))
const focus = inject(STEP_FOCUS_KEY, null)
const { t } = useI18n()
/** NEW outranks TOP: an arrival is the step's news even when it lands on top. */
const tagOf = (item: QueueItem) =>
  focus?.value.newIds.has(item.id) ? t('panels.newItem') : item.active ? t('panels.topItem') : undefined

const departed = useDepartedItems(() => props.items)
</script>

<template>
  <div class="relative flex flex-col gap-1.5">
    <p v-if="items.length === 0 && departed.length === 0" class="empty-slot">{{ empty }}</p>
    <TransitionGroup tag="ol" :name="transitionName" :data-testid="testid" class="relative flex flex-col gap-1.5">
      <li
        v-for="item in items"
        :key="item.id"
        :data-id="item.id"
        :aria-current="item.active ? 'step' : undefined"
        :data-new="focus?.newIds.has(item.id) || undefined"
        :class="
          cn(
            'queue-row flex w-full flex-col gap-[3px] px-2.5 py-[7px]',
            item.active && 'queue-item-active',
            travel?.arriving.value.has(item.id) && 'chip-arriving',
          )
        "
      >
        <div class="queue-row-head flex items-center gap-2 font-mono text-[11.5px] leading-[15px] font-medium">
          <span class="queue-row-tag shrink-0">{{ item.ref }}</span>
          <span v-if="item.kind" class="text-foreground-2 min-w-0 truncate font-sans text-xs leading-[15px] font-normal">{{ item.kind }}</span>
          <span v-if="item.chip?.line" class="text-muted-foreground ml-auto shrink-0">L{{ item.chip.line }}</span>
          <Badge v-if="tagOf(item)" class="queue-row-tag text-[11.5px]/[15px]" :class="!item.chip?.line && 'ml-auto'">{{ tagOf(item) }}</Badge>
        </div>
        <CallbackChip v-if="item.chip" :chip="item.chip" />
      </li>
    </TransitionGroup>
    <ol v-if="departed.length > 0" class="flex flex-col gap-1.5" aria-hidden="true">
      <QueueGhostRow v-for="item in departed" :key="item.id" :id="item.ref" :kind="item.kind" :code="item.chip?.text" />
    </ol>
  </div>
</template>
