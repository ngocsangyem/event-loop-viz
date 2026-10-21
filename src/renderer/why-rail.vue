<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TraceEvent } from '../trace/trace-event'
import EventDetail from './event-detail.vue'
import EventList from './event-list.vue'

/**
 * The right column of the replay (DESIGN.md · Why rail): why the current step happened, with its
 * spec link, then the Trace Events list. It replaces the old Trace events card and keeps its
 * region name, so "Trace events" still finds it.
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
    class="flex min-w-0 flex-col gap-5 p-4 [&_a]:scroll-mb-40 [&_button]:scroll-mb-40"
    data-testid="why-rail"
  >
    <div class="flex min-w-0 flex-col gap-2">
      <p v-if="event" class="label-mono text-muted-foreground flex flex-wrap gap-x-2">
        <span>{{ t('rail.why') }}</span>
        <span aria-hidden="true">·</span>
        <span class="text-foreground-2">{{ event.k }}</span>
        <span aria-hidden="true">·</span>
        <span>{{ t('rail.traceEvent', { seq: event.seq }) }}</span>
      </p>
      <EventDetail :events="events" :position="position" @select="position = $event" />
    </div>
    <div class="border-border-soft flex min-w-0 flex-col gap-2 border-t pt-4">
      <h2 class="label-mono text-muted-foreground">{{ t('rail.events') }}</h2>
      <EventList v-model="position" v-model:show-all="showAll" :events="events" />
    </div>
  </section>
</template>
