<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { explainEvent, phrasesFor } from '../player/explain-event'
import type { ExplainLocale } from '../player/explain-event'
import type { TraceEvent } from '../trace/trace-event'
import { Button } from '@/components/ui/button'

const props = defineProps<{ events: readonly TraceEvent[]; position: number }>()
const emit = defineEmits<{ select: [seq: number] }>()

const { t, locale } = useI18n()

const event = computed(() => props.events[props.position])
const explanation = computed(() =>
  event.value
    ? explainEvent(event.value, props.events, phrasesFor(locale.value as ExplainLocale))
    : null,
)
const cause = computed(() =>
  event.value?.cause === undefined ? undefined : props.events[event.value.cause],
)

/** Kind-specific fields only; the common ones are shown as their own rows. */
const payload = computed(() => {
  if (!event.value) return ''
  const common = new Set(['seq', 't', 'ref', 'loc', 'cause', 'visible'])
  const rest = Object.fromEntries(
    Object.entries(event.value).filter(([name]) => !common.has(name)),
  )
  return JSON.stringify(rest, null, 2)
})

const sourceLine = computed(() => {
  const loc = event.value?.loc
  return loc ? t('detail.sourceLine', { line: loc.line, column: loc.column }) : null
})
</script>

<template>
  <aside
    v-if="event && explanation"
    :aria-label="t('detail.region')"
    data-testid="event-detail"
    class="flex min-w-0 flex-col gap-2 text-sm"
  >
    <h2 class="font-mono text-sm font-medium">
      #{{ event.seq }} {{ event.k }}{{ event.visible ? '' : ` ${t('detail.bookkeeping')}` }}
    </h2>
    <p data-testid="event-explanation" class="text-muted-foreground">{{ explanation.text }}</p>
    <dl class="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-2 text-xs">
      <dt class="text-muted-foreground">{{ t('detail.specStep') }}</dt>
      <dd>
        <a
          data-testid="event-spec-link"
          class="text-primary underline underline-offset-4"
          :href="explanation.spec.url"
          target="_blank"
          rel="noopener noreferrer"
          >{{ explanation.spec.label }}</a
        >
      </dd>
      <dt class="text-muted-foreground">{{ t('detail.payload') }}</dt>
      <dd class="min-w-0">
        <pre data-testid="event-payload" class="bg-muted max-h-48 overflow-auto rounded-md p-2 font-mono">{{ payload }}</pre>
      </dd>
      <dt class="text-muted-foreground">{{ t('detail.source') }}</dt>
      <dd data-testid="event-source">{{ sourceLine ?? t('detail.noSource') }}</dd>
      <dt class="text-muted-foreground">{{ t('detail.cause') }}</dt>
      <dd data-testid="event-cause">
        <Button v-if="cause" variant="outline" size="xs" class="font-mono" @click="emit('select', cause.seq)">
          #{{ cause.seq }} {{ cause.k }}
        </Button>
        <template v-else>{{ t('detail.noCause') }}</template>
      </dd>
    </dl>
  </aside>
</template>
