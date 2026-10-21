<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TraceEvent } from '../trace/trace-event'
import EventDetail from './event-detail.vue'
import EventList from './event-list.vue'

/**
 * The right column of the replay (DESIGN.md · Why rail): why the current step happened, with its
 * spec link, then the Trace Events list filling the rest of the column and scrolling on its own.
 * It keeps the region name "Trace events", so the old card is still found by it.
 */
const props = defineProps<{ events: readonly TraceEvent[] }>()
const position = defineModel<number>({ required: true })
const showAll = defineModel<boolean>('showAll', { required: true })
const { t } = useI18n()

const event = computed(() => props.events[position.value])
</script>

<template>
  <!-- scroll-mb keeps a focused row or button clear of the pinned dock below. -->
  <section
    role="region"
    aria-label="Trace events"
    class="flex min-w-0 flex-col xl:h-full [&_a]:scroll-mb-40 [&_button]:scroll-mb-40"
    data-testid="why-rail"
  >
    <div class="border-border flex shrink-0 flex-col gap-3 border-b px-5 pt-4 pb-[18px] xl:max-h-[55%] xl:overflow-y-auto">
      <p v-if="event" class="label-mono flex gap-x-3">
        <span>{{ t('rail.why') }}</span>
        <span class="text-muted-foreground ml-auto">{{ t('rail.traceEvent', { seq: event.seq }) }}</span>
      </p>
      <EventDetail :events="events" :position="position" @select="position = $event" />
    </div>
    <EventList v-model="position" v-model:show-all="showAll" :events="events" />
  </section>
</template>
