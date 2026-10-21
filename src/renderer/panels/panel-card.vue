<script setup lang="ts">
import { computed, inject, shallowRef, watch } from 'vue'
import type { HTMLAttributes } from 'vue'
import { useI18n } from 'vue-i18n'
import { InfoIcon } from '@lucide/vue'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { STEP_FOCUS_KEY } from './step-focus-keys'

/** The event-loop concept a pane shows; it picks the pane's hue (panel-skin.css). */
export type PanelConcept = 'stack' | 'job' | 'task' | 'webapi' | 'console' | 'loop'

/**
 * One labelled region of the visualizer: a hue square, a mono title, an optional item count,
 * an info tooltip that says what the region models, and the region's content. Every panel uses
 * it so the grid reads as one system.
 *
 * A pane the current step changed is the step's focal point: it takes its concept's soft tint,
 * a 2px top rule and a CHANGED label (RUNNING for a busy Call Stack). On a phone the panes the
 * step left alone fold to their header row, which the reader can open again.
 */
const props = defineProps<{
  title: string
  concept?: PanelConcept
  info: string
  count?: number
  /** The pane is busy (a Call Stack with frames): its label reads RUNNING instead of CHANGED. */
  running?: boolean
  class?: HTMLAttributes['class']
  contentClass?: HTMLAttributes['class']
}>()
const { t } = useI18n()

// Outside the app (tests, stories) nothing provides a focus and no pane is ever marked.
const focus = inject(STEP_FOCUS_KEY, null)
const changed = computed(() => !!props.concept && !!focus?.value.changed.has(props.concept))
/** Folding needs a step to compare with; before that every pane stays open. */
const foldable = computed(() => !!focus && focus.value.changed.size > 0)
const opened = shallowRef(false)
// A pane the reader opened folds again once the step moves on, so the next change stands out.
watch(() => focus?.value, () => (opened.value = false))
const folded = computed(() => foldable.value && !changed.value && !opened.value)
const stateLabel = computed(() => (props.running ? t('panels.runningState') : changed.value ? t('panels.changed') : ''))
</script>

<template>
  <Card
    size="sm"
    role="region"
    :aria-label="title"
    :data-concept="concept"
    :data-changed="changed || undefined"
    :data-folded="folded || undefined"
    :class="cn('panel-card min-w-0 gap-2 pt-0!', props.class)"
  >
    <CardHeader class="panel-card-header border-border-soft h-[38px] items-center! border-b">
      <CardTitle class="flex items-center gap-2">
        <span class="panel-hue size-2 shrink-0" aria-hidden="true" />
        {{ title }}
        <span v-if="count !== undefined" class="meta-mono font-normal">{{ count }}</span>
      </CardTitle>
      <CardAction class="flex items-center gap-1">
        <span v-if="stateLabel" class="panel-state label-mono" data-testid="panel-state">{{ stateLabel }}</span>
        <slot name="actions" />
        <!-- Phone only: a folded pane opens on demand; the label names what the button shows. -->
        <button
          v-if="foldable && !changed"
          type="button"
          class="label-mono text-muted-foreground hover:text-foreground hover:bg-accent min-h-11 px-2 outline-none md:hidden"
          :aria-expanded="!folded"
          @click="opened = !opened"
        >
          {{ folded ? t('panels.show') : t('panels.hide') }}
        </button>
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground hover:bg-accent p-1 outline-none"
              :aria-label="t('panels.about', { title })"
            >
              <InfoIcon class="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{{ info }}</TooltipContent>
        </Tooltip>
      </CardAction>
    </CardHeader>
    <CardContent :class="cn('min-h-0 flex-1', folded && 'max-md:hidden', props.contentClass)">
      <slot />
    </CardContent>
  </Card>
</template>
