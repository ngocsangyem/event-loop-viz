<script setup lang="ts">
import { computed, inject, shallowRef, watch } from 'vue'
import type { HTMLAttributes } from 'vue'
import { useI18n } from 'vue-i18n'
import { cn } from '@/lib/utils'
import { STEP_FOCUS_KEY } from './step-focus-keys'

/** The event-loop concept a pane shows; it picks the pane's hue (panel-skin.css). */
export type PanelConcept = 'stack' | 'job' | 'task' | 'webapi' | 'console' | 'loop'

/**
 * One labelled region of the visualizer: a header row (hue square, mono title, item count, state
 * label), a one-line subtitle that says what the region is, and the region's content. Every panel
 * uses it so the grid reads as one system.
 *
 * A pane the current step changed is the step's focal point: it takes its concept's soft tint,
 * a 2px top rule and a CHANGED label (RUNNING for a busy Call Stack). On a phone the panes the
 * step left alone fold to their header row, which the reader can open again.
 */
const props = defineProps<{
  title: string
  concept?: PanelConcept
  /** One line under the header. */
  subtitle?: string
  /** The longer explanation of the region; reachable as the subtitle's tooltip. */
  info?: string
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
  <section
    role="region"
    :aria-label="title"
    :data-concept="concept"
    :data-changed="changed || undefined"
    :data-folded="folded || undefined"
    :class="cn('panel-card bg-background flex min-w-0 flex-col', props.class)"
  >
    <header class="panel-card-header label-mono flex h-(--pane-header-h) shrink-0 items-center gap-2 px-4">
      <span class="panel-hue size-2 shrink-0" aria-hidden="true" />
      <span class="text-foreground">{{ title }}</span>
      <span v-if="count !== undefined" class="text-muted-foreground tabular-nums">{{ count }}</span>
      <span class="flex-1" />
      <span v-if="stateLabel" class="panel-state" data-testid="panel-state">{{ stateLabel }}</span>
      <slot name="actions" />
      <!-- Phone only: a folded pane opens on demand; the label names what the button shows. -->
      <button
        v-if="foldable && !changed"
        type="button"
        class="text-muted-foreground hover:text-foreground hover:bg-accent min-h-11 px-2 outline-none md:hidden"
        :aria-expanded="!folded"
        @click="opened = !opened"
      >
        {{ folded ? t('panels.show') : t('panels.hide') }}
      </button>
    </header>
    <p
      v-if="subtitle"
      :title="info"
      :class="cn('text-foreground-2 px-4 pb-2.5 text-[12.5px] leading-[17px]', folded && 'max-md:hidden')"
    >
      {{ subtitle }}
    </p>
    <div :class="cn('flex min-h-0 flex-1 flex-col gap-1.5 px-4 pb-4', folded && 'max-md:hidden', props.contentClass)">
      <slot />
    </div>
  </section>
</template>
