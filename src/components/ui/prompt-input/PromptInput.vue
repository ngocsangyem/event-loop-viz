<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'
import { computed, useId, useTemplateRef } from 'vue'

/**
 * Single-line composer: `❯` prompt, mono input and a `[↵]SEND` button (STOP while busy).
 * Enter sends unless an IME is composing; empty/whitespace input never sends.
 */
const props = withDefaults(defineProps<{
  placeholder?: string
  hint?: string
  size?: 'lg' | 'touch'
  disabled?: boolean
  busy?: boolean
  label?: string
  class?: HTMLAttributes['class']
}>(), {
  placeholder: 'Ask a follow-up…',
  size: 'lg',
})
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ send: [value: string], stop: [] }>()

const hintId = useId()
const input = useTemplateRef<HTMLInputElement>('input')
const canSend = computed(() => !props.disabled && model.value.trim() !== '')
const touch = computed(() => props.size === 'touch')

function send() {
  if (!canSend.value) return
  emit('send', model.value.trim())
}

function onEnter(event: KeyboardEvent) {
  // Enter during IME composition confirms the candidate; it is not a submit.
  if (event.isComposing || props.busy) return
  event.preventDefault()
  send()
}

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div data-slot="prompt-input" :class="cn('flex flex-col gap-1.5', props.class)">
    <div
      :class="cn(
        'flex items-center border border-border bg-background pr-1 pl-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
        touch ? 'h-(--control-touch)' : 'h-(--control-lg)',
        disabled && 'opacity-50',
      )"
    >
      <span class="mr-2 font-mono text-[13px] text-brand" aria-hidden="true">❯</span>
      <input
        ref="input"
        v-model="model"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-label="label ?? placeholder"
        :aria-describedby="hint ? hintId : undefined"
        autocomplete="off"
        class="h-full min-w-0 flex-1 bg-transparent font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        @keydown.enter="onEnter"
      >
      <button
        v-if="busy"
        type="button"
        data-slot="prompt-input-stop"
        :class="cn(
          'h-[calc(100%-8px)] shrink-0 px-3 font-mono text-[11.5px] leading-none font-medium tracking-[0.02em] uppercase outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          touch ? 'bg-foreground text-background' : 'bg-transparent text-foreground hover:bg-accent',
        )"
        @click="emit('stop')"
      >
        Stop
      </button>
      <button
        v-else
        type="button"
        data-slot="prompt-input-send"
        :disabled="!canSend"
        :class="cn(
          'inline-flex h-[calc(100%-8px)] shrink-0 items-center gap-0.5 px-3 font-mono text-[11.5px] leading-none font-medium tracking-[0.02em] uppercase outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-35',
          touch ? 'bg-foreground text-background' : 'bg-transparent text-foreground enabled:hover:bg-accent',
        )"
        @click="send"
      >
        <span v-if="!touch" class="text-muted-foreground" aria-hidden="true">[↵]</span>Send
      </button>
    </div>
    <p v-if="hint" :id="hintId" class="font-mono text-[11px] leading-[14px] font-normal text-muted-foreground">
      {{ hint }}
    </p>
  </div>
</template>
