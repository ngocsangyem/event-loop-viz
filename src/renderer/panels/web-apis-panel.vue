<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReplayState } from '../../player/replay-state'
import { chipLabelsOf, chipOf, chipsOf } from './callback-chip-model'
import { webApiCardsOf, webOpCardsOf } from './web-api-card-model'
import { CHIP_TRAVEL_KEY } from './chip-travel-keys'
import PanelCard from './panel-card.vue'
import QueueGhostRow from './queue-ghost-row.vue'
import WebApiTimerCard from './web-api-timer-card.vue'
import WebApiOpCard from './web-api-op-card.vue'
import { useDepartedItems } from './use-departed-items'

const props = defineProps<{ state: ReplayState; source: string }>()
const { t } = useI18n()

// Outside the app there is no travel layer; after a jump cards appear and vanish without fading.
const travel = inject(CHIP_TRAVEL_KEY, null)
const transitionName = computed(() => (travel?.snapping.value ? 'queue-snap' : 'queue-item'))
const model = computed(() => webApiCardsOf(props.state))
const ops = computed(() => webOpCardsOf(props.state))
const chips = computed(() => chipsOf(props.state, props.source, chipLabelsOf(t)))
// A timer or operation that finished leaves a dashed ghost here for the step its Task appears in the Task Queue.
const departed = useDepartedItems(() => [
  ...model.value.cards.map((card) => ({ id: card.key, key: card.key, label: `${card.api} #${card.tid}` })),
  ...ops.value.cards.map((card) => ({ id: card.key, key: card.key, label: t(`panels.webApis.op.${card.api}`) })),
])
const hidden = computed(() => model.value.hidden + ops.value.hidden)
</script>

<template>
  <PanelCard
    data-drive-target="web-apis"
    concept="webapi"
    :title="t('panels.webApis.title')"
    :subtitle="t('panels.webApis.subtitle')"
    :info="t('panels.webApis.info')"
    :count="state.timers.length + state.webOps.length"
  >
    <p v-if="model.cards.length === 0 && ops.cards.length === 0 && departed.length === 0" class="empty-slot">{{ t('panels.webApis.empty') }}</p>
    <TransitionGroup tag="ol" :name="transitionName" data-testid="panel-web-apis" class="relative flex flex-col gap-1.5">
      <WebApiTimerCard
        v-for="card in model.cards"
        :key="card.key"
        :card="card"
        :chip="chipOf(chips, card.key, 'webapis').chip"
      />
      <WebApiOpCard
        v-for="card in ops.cards"
        :key="card.key"
        :card="card"
        :chip="chipOf(chips, card.key, 'webapis').chip"
      />
    </TransitionGroup>
    <ol v-if="departed.length > 0" class="flex flex-col gap-1.5" aria-hidden="true">
      <QueueGhostRow
        v-for="card in departed"
        :key="card.key"
        :id="card.label"
        :code="chipOf(chips, card.key, 'taskq').chip?.text"
      />
    </ol>
    <p v-if="hidden > 0" class="meta-mono text-center">
      {{ t('panels.webApis.more', { count: hidden }) }}
    </p>
  </PanelCard>
</template>
