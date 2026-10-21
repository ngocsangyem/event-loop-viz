<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'
import { computed, useId } from 'vue'

/**
 * Labelled single-line field: mono label, 40px boxed input, optional right-hand action
 * (e.g. SHOW for secrets), error line and helper text. The focus ring sits on the box
 * (not the bare input) so the whole control reads as focused.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  label?: string
  placeholder?: string
  type?: string
  error?: string
  helper?: string
  action?: string
  mono?: boolean
  size?: 'lg' | 'touch'
  disabled?: boolean
  class?: HTMLAttributes['class']
}>(), {
  type: 'text',
  mono: true,
  size: 'lg',
})
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ action: [] }>()

const id = useId()
const errorId = `${id}-error`
const helperId = `${id}-helper`
const describedBy = computed(() => [props.error && errorId, props.helper && helperId].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div data-slot="text-field" :class="cn('flex flex-col gap-1.5', props.class)">
    <label
      v-if="label"
      :for="id"
      class="font-mono text-[11.5px] leading-[14px] font-medium tracking-[0.02em] text-muted-foreground"
    >{{ label }}</label>
    <div
      data-slot="text-field-box"
      :data-invalid="error ? '' : undefined"
      :class="cn(
        'flex items-center border bg-background focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
        size === 'touch' ? 'h-(--control-touch)' : 'h-(--control-lg)',
        error ? 'border-error' : 'border-border',
        disabled && 'opacity-50',
      )"
    >
      <input
        v-bind="$attrs"
        :id="id"
        v-model="model"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        :class="cn(
          'h-full min-w-0 flex-1 bg-transparent px-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed',
          mono ? 'font-mono' : 'font-sans',
        )"
      >
      <button
        v-if="action"
        type="button"
        :disabled="disabled"
        class="h-full shrink-0 bg-transparent px-3 font-mono text-[11.5px] leading-none font-medium tracking-[0.02em] text-foreground uppercase outline-none hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        @click="emit('action')"
      >
        {{ action }}
      </button>
    </div>
    <p v-if="error" :id="errorId" role="alert" class="font-mono text-xs leading-4 text-error">
      <span aria-hidden="true">⚠ </span>{{ error }}
    </p>
    <p v-if="helper" :id="helperId" class="text-[13px] leading-5 text-foreground-2">
      {{ helper }}
    </p>
  </div>
</template>
