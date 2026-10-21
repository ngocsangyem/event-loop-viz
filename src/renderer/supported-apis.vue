<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const { t } = useI18n()

/** What the simulator models (message keys); everything else in the Unsupported list throws. */
const SUPPORTED = ['promises', 'timers', 'microtask', 'messageChannel', 'console', 'clock', 'random']
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="ghost" size="sm">
        {{ t('supportedApis.button') }}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-80" data-testid="supported-apis">
      <ul class="list-disc space-y-1 pl-4 text-xs">
        <li v-for="item in SUPPORTED" :key="item">{{ t(`supportedApis.${item}`) }}</li>
      </ul>
    </PopoverContent>
  </Popover>
</template>
