<script setup lang="ts">
import { shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronsUpDownIcon, Loader2Icon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ModelInfo } from './openrouter-models'

/**
 * Searchable model list (a combobox) in a popover. When the list could not load, a text field
 * takes a model id by hand.
 */
const props = defineProps<{
  models: readonly ModelInfo[]
  status: 'loading' | 'ready' | 'error'
  /** Small trigger for the chat footer; the default fills the settings form. */
  compact?: boolean
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
      <Button
        variant="outline"
        :size="compact ? 'xs' : 'default'"
        :class="compact ? 'max-w-48 min-w-0 font-normal' : 'w-full justify-between font-normal'"
        :aria-label="t('ai.input.model', { model: label() || t('ai.models.choose') })"
        data-testid="ask-ai-model"
      >
        <span class="truncate">{{ label() || t('ai.models.choose') }}</span>
        <ChevronsUpDownIcon class="opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-80 p-1" data-testid="ask-ai-model-list">
      <p v-if="status === 'loading'" class="text-muted-foreground flex items-center gap-2 p-3 text-xs" role="status">
        <Loader2Icon class="size-4 animate-spin motion-reduce:animate-none" />
        {{ t('ai.models.loading') }}
      </p>
      <Command v-else-if="status === 'ready'" :model-value="model">
        <CommandInput :placeholder="t('ai.models.search')" :aria-label="t('ai.models.search')" />
        <CommandList>
          <CommandEmpty>{{ t('ai.models.empty') }}</CommandEmpty>
          <CommandGroup>
            <CommandItem
              v-for="m in models"
              :key="m.id"
              :value="m.id"
              :data-testid="`ask-ai-model-${m.id}`"
              @select="choose(m.id)"
            >
              <span class="flex min-w-0 flex-col">
                <span class="truncate">{{ m.name }}</span>
                <span class="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <span class="truncate">{{ m.id }}</span>
                  <span v-if="m.contextLength" class="shrink-0">{{ t('ai.models.context', { size: contextSize(m) }) }}</span>
                  <Badge v-if="m.free" variant="secondary" class="h-4 px-1 text-[0.65rem]">{{ t('ai.models.free') }}</Badge>
                </span>
              </span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
      <form v-else class="flex flex-col gap-2 p-2" @submit.prevent="useManual">
        <p class="text-muted-foreground text-xs" role="alert">{{ t('ai.models.loadFailed') }}</p>
        <label class="text-xs font-medium" for="ask-ai-manual-model">{{ t('ai.models.manual') }}</label>
        <Input id="ask-ai-manual-model" v-model="manual" :placeholder="t('ai.models.manualPlaceholder')" autocomplete="off" />
        <div class="flex gap-2">
          <Button type="submit" size="sm" :disabled="manual.trim() === ''">{{ t('ai.models.manualUse') }}</Button>
          <Button type="button" variant="outline" size="sm" @click="emit('retry')">{{ t('ai.models.retry') }}</Button>
        </div>
      </form>
    </PopoverContent>
  </Popover>
</template>
