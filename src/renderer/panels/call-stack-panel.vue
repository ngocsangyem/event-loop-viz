<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReplayState } from '../../player/replay-state'
import type { StackPlateModel } from '../scene/call-stack-model'
import { chipLabelsOf, builtinLabel, chipsOf } from './callback-chip-model'
import { visibleFrames } from './panel-view-model'
import PanelCard from './panel-card.vue'
import QueueList from './queue-list.vue'
import type { QueueItem } from './queue-list.vue'

const props = defineProps<{ state: ReplayState; source: string }>()
const { t } = useI18n()

const label = (frame: StackPlateModel) => (frame.builtin ? builtinLabel(frame.label) : frame.label)

/** Top of the stack first, like a stack of plates seen from above. */
const items = computed(() => {
  const shown = visibleFrames(props.state)
  const top = shown.length - 1
  const chips = chipsOf(props.state, props.source, chipLabelsOf(t))
  const running = props.state.runningCallback
  const onStack = running && chips.get(running.chipId)?.place === 'stack' ? chips.get(running.chipId) : undefined
  return shown
    .map((frame, i): QueueItem => {
      const item: QueueItem = { id: frame.frameId, label: label(frame), active: i === top }
      // The chip stands for the callback's frame; the function's own name moves to the tooltip.
      if (onStack && frame.frameId === running?.frameId) {
        const named = frame.label !== '(anonymous)' && !frame.builtin
        item.chip = named ? { ...onStack, kind: frame.label } : onStack
      }
      return item
    })
    .reverse()
})
</script>

<template>
  <PanelCard
    concept="stack"
    :title="t('panels.callStack.title')"
    :info="t('panels.callStack.info')"
    :count="items.length"
  >
    <QueueList :items="items" :empty="t('panels.callStack.empty')" testid="panel-call-stack" />
  </PanelCard>
</template>
