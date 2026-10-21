<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useI18n } from 'vue-i18n'
import { InfoIcon } from '@lucide/vue'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/** The event-loop concept a pane shows; it picks the pane's hue (panel-skin.css). */
export type PanelConcept = 'stack' | 'job' | 'task' | 'webapi' | 'console' | 'loop'

/**
 * One labelled region of the visualizer: a hue square, a mono title, an optional item count,
 * an info tooltip that says what the region models, and the region's content. Every panel uses
 * it so the grid reads as one system.
 */
const props = defineProps<{
  title: string
  concept?: PanelConcept
  info: string
  count?: number
  class?: HTMLAttributes['class']
  contentClass?: HTMLAttributes['class']
}>()
const { t } = useI18n()
</script>

<template>
  <Card
    size="sm"
    role="region"
    :aria-label="title"
    :data-concept="concept"
    :class="cn('panel-card min-w-0 gap-2 pt-0!', props.class)"
  >
    <CardHeader class="panel-card-header border-border-soft h-[38px] items-center! border-b">
      <CardTitle class="flex items-center gap-2">
        <span class="panel-hue size-2 shrink-0" aria-hidden="true" />
        {{ title }}
        <span v-if="count !== undefined" class="meta-mono font-normal">{{ count }}</span>
      </CardTitle>
      <CardAction class="flex items-center gap-1">
        <slot name="actions" />
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
    <CardContent :class="cn('min-h-0 flex-1', props.contentClass)">
      <slot />
    </CardContent>
  </Card>
</template>
