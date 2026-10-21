<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReplayState } from '../../player/replay-state'
import { chipLabelsOf, chipOf, chipsOf } from './callback-chip-model'
import { webApiCardsOf } from './web-api-card-model'
import { CHIP_TRAVEL_KEY } from './chip-travel-keys'
import PanelCard from './panel-card.vue'
import WebApiTimerCard from './web-api-timer-card.vue'

const props = defineProps<{ state: ReplayState; source: string }>()
const { t } = useI18n()

// Outside the app there is no travel layer; after a jump cards appear and vanish without fading.
const travel = inject(CHIP_TRAVEL_KEY, null)
const transitionName = computed(() => (travel?.snapping.value ? 'queue-snap' : 'queue-item'))
const model = computed(() => webApiCardsOf(props.state))
const chips = computed(() => chipsOf(props.state, props.source, chipLabelsOf(t)))
</script>

<template>
  <PanelCard
    :title="t('panels.webApis.title')"
    :info="t('panels.webApis.info')"
    :count="state.timers.length"
  >
    <p v-if="model.cards.length === 0" class="text-muted-foreground py-2 text-center text-xs">
      {{ t('panels.webApis.empty') }}
    </p>
    <TransitionGroup tag="ol" :name="transitionName" data-testid="panel-web-apis" class="relative flex flex-col gap-1.5">
      <WebApiTimerCard
        v-for="card in model.cards"
        :key="card.key"
        :card="card"
        :chip="chipOf(chips, card.key, 'webapis').chip"
      />
    </TransitionGroup>
    <p v-if="model.hidden > 0" class="text-muted-foreground pt-1.5 text-center text-xs">
      {{ t('panels.webApis.more', { count: model.hidden }) }}
    </p>
  </PanelCard>
</template>
