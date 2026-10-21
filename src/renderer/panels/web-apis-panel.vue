<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReplayState } from '../../player/replay-state'
import { timerShelfOf } from '../scene/timer-shelf-model'
import PanelCard from './panel-card.vue'
import QueueList from './queue-list.vue'
import type { QueueItem } from './queue-list.vue'

const props = defineProps<{ state: ReplayState }>()
const { t } = useI18n()

/** Pending timers, soonest due first. */
const items = computed(() =>
  timerShelfOf(props.state, Number.POSITIVE_INFINITY).shown.map(
    (timer): QueueItem => ({
      id: timer.tid,
      label: `${timer.repeat ? 'setInterval' : 'setTimeout'} ${timer.tid}`,
      detail: t('panels.due', { due: timer.due }),
    }),
  ),
)
</script>

<template>
  <PanelCard
    :title="t('panels.webApis.title')"
    :info="t('panels.webApis.info')"
    :count="items.length"
  >
    <QueueList :items="items" :empty="t('panels.webApis.empty')" testid="panel-web-apis" />
  </PanelCard>
</template>
