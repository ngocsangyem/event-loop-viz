<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { NavTabItem } from '.'
import { cn } from 'cn'
import { Kbd } from '@/components/ui/kbd'

const props = withDefaults(defineProps<{
  items: NavTabItem[]
  modelValue?: string
  ariaLabel?: string
  /** CSS length of the tab strip; the active rule sits on its bottom edge. */
  height?: string
  /** Stretch the tabs to share the row equally (phone layout). */
  fill?: boolean
  class?: HTMLAttributes['class']
}>(), {
  height: 'var(--header-h)',
})

const emit = defineEmits<{ 'update:modelValue': [key: string] }>()
</script>

<template>
  <nav
    data-slot="nav-tabs"
    :aria-label="ariaLabel"
    :style="{ height }"
    :class="cn('flex items-stretch', fill && 'w-full', props.class)"
  >
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      data-slot="nav-tab"
      :disabled="item.disabled"
      :aria-current="item.key === modelValue ? 'page' : undefined"
      :class="cn(
        'inline-flex items-center gap-1 px-2.5 font-mono text-xs leading-none font-medium uppercase tracking-[0.02em] whitespace-nowrap transition-colors duration-(--motion-fast) ease-(--ease-out) select-none',
        fill && 'flex-1 justify-center',
        item.key === modelValue
          ? 'text-foreground shadow-[inset_0_-2px_0_var(--foreground)]'
          : 'text-foreground-2 hover:text-foreground',
        'disabled:cursor-not-allowed disabled:opacity-55',
      )"
      @click="emit('update:modelValue', item.key)"
    >
      <Kbd v-if="item.hotkey" aria-hidden="true" class="max-sm:hidden">{{ item.hotkey }}</Kbd>
      {{ item.label }}
    </button>
  </nav>
</template>
