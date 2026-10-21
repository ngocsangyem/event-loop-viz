<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { MinusIcon, SettingsIcon, SparklesIcon, Trash2Icon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Title, what the AI reads (the whole Run), and the clear / settings / minimize buttons. */
defineProps<{ stepCount: number; canClear: boolean }>()
const emit = defineEmits<{ clear: []; settings: []; minimize: [] }>()
const { t } = useI18n()
</script>

<template>
  <header class="flex flex-col gap-1.5 border-b px-3 pt-3 pb-2.5">
    <div class="flex items-center gap-1">
      <SparklesIcon class="text-brand mr-1 size-4" aria-hidden="true" />
      <h2 id="ask-ai-title" class="label-mono mr-auto">{{ t('ai.title') }}</h2>
      <Tooltip v-if="canClear">
        <TooltipTrigger as-child>
          <Button variant="ghost" size="icon-sm" :aria-label="t('ai.clear')" data-testid="ask-ai-clear" @click="emit('clear')">
            <Trash2Icon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ t('ai.clear') }}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="ghost" size="icon-sm" :aria-label="t('ai.settings')" data-testid="ask-ai-settings-button" @click="emit('settings')">
            <SettingsIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ t('ai.settings') }}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="ghost" size="icon-sm" :aria-label="t('ai.minimize')" data-testid="ask-ai-minimize" @click="emit('minimize')">
            <MinusIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ t('ai.minimize') }}</TooltipContent>
      </Tooltip>
    </div>
    <p id="ask-ai-description" class="sr-only">{{ t('ai.description') }}</p>
    <div>
      <Badge variant="outline" data-testid="ask-ai-context">
        <span class="sr-only">{{ t('ai.context.label') }}: </span>
        {{ stepCount > 0 ? t('ai.context.run', { count: stepCount }) : t('ai.context.none') }}
      </Badge>
    </div>
  </header>
</template>
