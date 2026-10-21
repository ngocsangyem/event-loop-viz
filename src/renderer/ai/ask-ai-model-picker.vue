<script setup lang="ts">
import { shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TextField } from '@/components/ui/text-field'
import type { ModelInfo } from './openrouter-models'

/**
 * Searchable model list in a popover, its trigger styled like a Select (`▾`). When the list
 * could not load, a text field takes a model id by hand.
 */
const props = defineProps<{
  models: readonly ModelInfo[]
  status: 'loading' | 'ready' | 'error'
}>()
const model = defineModel<string>({ required: true })
const emit = defineEmits<{ retry: [] }>()

const { t } = useI18n()
const open = shallowRef(false)
const manual = shallowRef('')

const label = () => props.models.find((m) => m.id === model.value)?.name ?? model.value

function choose(id: string) {
  model.value = id
  open.value = false
}

function useManual() {
  const id = manual.value.trim()
  if (id) choose(id)
}

const contextSize = (m: ModelInfo) => Math.round(m.contextLength / 1000)
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="border-border bg-background text-foreground hover:bg-accent aria-expanded:border-foreground focus-visible:outline-ring flex h-10 w-full items-center justify-between gap-2 border px-3 font-mono text-[13px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
        :aria-label="t('ai.models.label')"
        data-testid="ask-ai-model"
      >
        <span class="truncate">{{ label() || t('ai.models.choose') }}</span>
        <span class="text-muted-foreground" aria-hidden="true">▾</span>
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-(--reka-popover-trigger-width) min-w-72 gap-0 p-0" data-testid="ask-ai-model-list">
      <p v-if="status === 'loading'" class="text-muted-foreground flex items-center gap-2 p-3 font-mono text-xs" role="status">
        <span class="text-brand animate-pulse motion-reduce:animate-none" aria-hidden="true">✻</span>
        {{ t('ai.models.loading') }}
      </p>
      <Command v-else-if="status === 'ready'" :model-value="model">
        <CommandInput :placeholder="t('ai.models.search')" :aria-label="t('ai.models.search')" />
        <CommandList>
          <CommandEmpty>{{ t('ai.models.empty') }}</CommandEmpty>
          <CommandGroup>
            <CommandItem v-for="m in models" :key="m.id" :value="m.id" :data-testid="`ask-ai-model-${m.id}`" @select="choose(m.id)">
              <span class="truncate">{{ m.name }}</span>
              <span class="text-muted-foreground truncate text-[11px]">{{ m.id }}</span>
              <span v-if="m.contextLength" class="text-muted-foreground shrink-0 text-[11px]">{{ t('ai.models.context', { size: contextSize(m) }) }}</span>
              <Badge v-if="m.free" variant="job">{{ t('ai.models.free') }}</Badge>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
      <form v-else class="flex flex-col gap-3 p-3" @submit.prevent="useManual">
        <p class="text-foreground-2 text-[13px] leading-5" role="alert">{{ t('ai.models.loadFailed') }}</p>
        <TextField v-model="manual" :label="t('ai.models.manual')" :placeholder="t('ai.models.manualPlaceholder')" autocomplete="off" />
        <div class="flex gap-1.5">
          <Button type="submit" size="sm" :disabled="manual.trim() === ''">{{ t('ai.models.manualUse') }}</Button>
          <Button type="button" variant="secondary" size="sm" @click="emit('retry')">{{ t('ai.models.retry') }}</Button>
        </div>
      </form>
    </PopoverContent>
  </Popover>
</template>
