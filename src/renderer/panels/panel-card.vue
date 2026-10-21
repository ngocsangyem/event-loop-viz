<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useI18n } from 'vue-i18n'
import { InfoIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * One labelled region of the visualizer: a title, an info tooltip that says what the region
 * models, an optional item count and the region's content. Every panel uses it so the grid
 * reads as one system.
 */
const props = defineProps<{
  title: string
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
    :class="cn('min-w-0 gap-2', props.class)"
  >
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        {{ title }}
        <Badge v-if="count !== undefined" variant="secondary" class="tabular-nums">{{ count }}</Badge>
      </CardTitle>
      <CardAction class="flex items-center gap-1">
        <slot name="actions" />
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-md p-1 outline-none focus-visible:ring-3"
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
