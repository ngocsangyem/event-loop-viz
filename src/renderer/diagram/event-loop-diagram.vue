<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useElementSize, usePreferredReducedMotion } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import type { ReplayState } from '../../player/replay-state'
import type { TraceEvent } from '../../trace/trace-event'
import DiagramEdge from './diagram-edge.vue'
import { EDGE_ENDS, EDGE_IDS, flowForEvent } from './diagram-flow'
import type { NodeId } from './diagram-flow'
import { layoutFor } from './diagram-layout'
import DiagramLoopContent from './diagram-loop-content.vue'
import { diagramModelOf } from './diagram-model'
import type { Capacity, ListModel, RowModel } from './diagram-model'
import DiagramNode from './diagram-node.vue'
import DiagramRows from './diagram-rows.vue'
import { useDiagramMotion } from './use-diagram-motion'
import './diagram.css'

/**
 * Architecture-style animated diagram of the event loop at one Trace position. The cards are a
 * pure function of `state`. `event` (the step just taken) decides which edges are highlighted
 * and which cards are lit, and, when it is the next event forward, plays the signal along them.
 */
const props = defineProps<{ state: ReplayState; event: TraceEvent | undefined }>()
const { t } = useI18n()

type ListNode = Exclude<NodeId, 'loop'>
/** Cards in reading order, with the message keys of their title and empty text. */
const NODES: { id: NodeId; title: string; empty?: string }[] = [
  { id: 'stack', title: 'panels.callStack.title', empty: 'panels.callStack.empty' },
  { id: 'webapis', title: 'panels.webApis.title', empty: 'panels.webApis.empty' },
  { id: 'taskq', title: 'panels.taskQueue.title', empty: 'panels.taskQueue.empty' },
  { id: 'microq', title: 'panels.microtaskQueue.title', empty: 'panels.microtaskQueue.empty' },
  { id: 'loop', title: 'panels.eventLoop.title' },
  { id: 'console', title: 'console.title', empty: 'console.empty' },
]

const wrapper = ref<HTMLElement | null>(null)
const svg = ref<SVGSVGElement | null>(null)
const { width } = useElementSize(wrapper)
const layout = computed(() => layoutFor(width.value))
const reducedMotion = usePreferredReducedMotion()

const model = computed(() => diagramModelOf(props.state, layout.value.capacity))
const flow = computed(() => flowForEvent(props.event, props.state.currentTaskSource))

/** Where the arrow arriving at a card touches it: the card's border draws in from there. */
const entryOf = (id: NodeId) => {
  const edge = flow.value.edges.find((e) => EDGE_ENDS[e].to === id)
  return edge ? layout.value.edges[edge].points.at(-1)! : null
}
const listOf = (id: NodeId): ListModel => model.value[id as ListNode]

const stepText = computed(() => {
  const step = flow.value.step
  return step ? t(`diagram.step.${step.key}`, step.params) : null
})
const ariaLabel = computed(() => (stepText.value ? t('diagram.summary', { step: stepText.value }) : t('diagram.idle')))

/** Every card's content in words, for screen readers: the picture itself is one image. */
const listing = computed(() => {
  const everything: Capacity = { stack: Infinity, webapis: Infinity, taskq: Infinity, microq: Infinity, console: Infinity }
  const full = diagramModelOf(props.state, everything)
  const text = (row: RowModel) => (row.labelKey ? t(row.labelKey) : row.label)
  return NODES.filter((n) => n.id !== 'loop').map(({ id, title }) => {
    const items = full[id as ListNode].rows.map(text).join(', ')
    return t('diagram.contents', { name: t(title), items: items || t('diagram.nothing') })
  })
})

const { play, cancel } = useDiagramMotion(svg)

// A new step cancels whatever is still travelling. Only the next event forward plays; seeking
// back, scrubbing and the first paint show the still picture for the event.
watch(
  () => props.event,
  (event, previous) => {
    cancel()
    const f = flow.value
    const forward = event !== undefined && previous !== undefined && event.seq > previous.seq
    if (forward && reducedMotion.value !== 'reduce' && (f.edges.length > 0 || f.lit.length > 0)) {
      play(f, layout.value)
    }
  },
  { flush: 'post' },
)
watch([layout, reducedMotion], cancel)
</script>

<template>
  <div
    ref="wrapper"
    class="diagram-root"
    data-testid="diagram"
    :data-layout="layout.id"
    :data-refused="flow.refused ? 'true' : 'false'"
  >
    <svg
      ref="svg"
      role="img"
      :aria-label="ariaLabel"
      :viewBox="`0 0 ${layout.width} ${layout.height}`"
      preserveAspectRatio="xMidYMid meet"
    >
      <DiagramNode
        v-for="node in NODES"
        :id="node.id"
        :key="node.id"
        :rect="layout.nodes[node.id]"
        :title="t(node.title)"
        :lit="flow.lit.includes(node.id)"
        :refused="flow.lit.includes(node.id) && !!flow.refused"
        :entry="entryOf(node.id)"
      >
        <DiagramLoopContent v-if="node.id === 'loop'" :rect="layout.nodes.loop" :loop="model.loop" />
        <DiagramRows v-else :rect="layout.nodes[node.id]" :list="listOf(node.id)" :empty="t(node.empty!)" />
      </DiagramNode>
      <DiagramEdge
        v-for="id in EDGE_IDS"
        :id="id"
        :key="id"
        :layout="layout.edges[id]"
        :label="t(`diagram.edge.${id}`)"
        :active="flow.edges.includes(id)"
        :refused="flow.edges.includes(id) && !!flow.refused"
        :order="flow.edges.indexOf(id) + 1"
      />
      <g class="diagram-signal" data-part="signal" aria-hidden="true">
        <circle r="10" opacity="0.28" />
        <circle r="4.5" />
      </g>
    </svg>
    <ul class="sr-only" data-testid="diagram-listing">
      <li v-for="line in listing" :key="line">{{ line }}</li>
    </ul>
  </div>
</template>
