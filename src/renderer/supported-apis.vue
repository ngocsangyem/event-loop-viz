<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const { t } = useI18n()
const open = ref(false)

/**
 * What the simulator models, by the concept each API lands in (message keys). Everything else
 * in the Unsupported list throws, so this list is the whole contract with the learner.
 */
const GROUPS = [
  {
    id: 'timer',
    hue: 'text-webapi',
    items: ['timers', 'raf', 'messageChannel', 'postMessage', 'fetch', 'clock', 'random'],
  },
  { id: 'dom', hue: 'text-task', items: ['window', 'dom', 'events'] },
  { id: 'job', hue: 'text-job', items: ['promises', 'microtask', 'modules', 'weak', 'atomics'] },
  { id: 'console', hue: 'text-console', items: ['console'] },
] as const
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <!-- Stretches to the header height so the open state's underline sits on the header rule. -->
      <Button
        variant="ghost"
        size="sm"
        hotkey="?"
        class="h-auto self-stretch data-[state=open]:shadow-[inset_0_-2px_0_var(--foreground)]"
        :aria-label="t('supportedApis.button')"
      >
        <!-- The full label does not fit a phone header next to the other controls. -->
        <span aria-hidden="true" class="max-sm:hidden">{{ t('supportedApis.button') }}</span>
        <span aria-hidden="true" class="sm:hidden">{{ t('supportedApis.buttonShort') }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" :side-offset="0" class="w-[340px] gap-3.5 p-4" data-testid="supported-apis">
      <p class="text-muted-foreground font-mono text-xs leading-none font-medium tracking-[0.02em] uppercase">
        {{ t('supportedApis.title') }}
      </p>
      <section v-for="group in GROUPS" :key="group.id" class="flex flex-col gap-1">
        <h3 :class="['font-mono text-[11px] leading-[14px] font-medium tracking-[0.02em] uppercase', group.hue]">
          {{ t(`supportedApis.group.${group.id}`) }}
        </h3>
        <ul class="text-foreground font-mono text-[12.5px] leading-[19px]">
          <li v-for="item in group.items" :key="item">{{ t(`supportedApis.${item}`) }}</li>
        </ul>
      </section>
      <p class="border-border-soft text-foreground-2 border-t pt-3 font-sans text-[13px] leading-5">
        {{ t('supportedApis.footer') }}
      </p>
    </PopoverContent>
  </Popover>
</template>
