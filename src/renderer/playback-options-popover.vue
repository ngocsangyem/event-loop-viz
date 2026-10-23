<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { SPEEDS } from './use-playback'
import type { Speed } from './use-playback'

/**
 * The dock's `PLAYBACK 1×` word: the speed and the Auto-play switch live behind it, so the dock row
 * keeps only the transport and the guided modes. The word prints the current speed so the setting
 * that changes playback the most stays readable without opening it.
 */
const props = defineProps<{ disabled: boolean }>()
const speed = defineModel<Speed>('speed', { required: true })
/** Start playing as soon as a Run produces a Trace. */
const autoplay = defineModel<boolean>('autoplay', { required: true })
const { t } = useI18n()

/** The speed Select works in strings; playback keeps the number. */
const speedText = computed({
  get: () => String(speed.value),
  set: (value: string) => (speed.value = Number(value) as Speed),
})
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="secondary" size="lg" class="max-sm:h-11 max-sm:min-w-11" data-control="playback-options">
        {{ t('transport.options') }}
        <span class="text-muted-foreground tabular-nums normal-case">{{ speed }}×</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" class="flex w-64 flex-col gap-3" data-testid="playback-options">
      <p class="label-mono text-muted-foreground">{{ t('transport.optionsTitle') }}</p>
      <div class="flex items-center justify-between gap-3">
        <span class="text-foreground-2 text-[13px]">{{ t('transport.speed') }}</span>
        <Select v-model="speedText" :disabled="props.disabled">
          <SelectTrigger size="sm" :aria-label="t('transport.speed')" class="w-20 max-sm:h-11!">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="s in SPEEDS" :key="s" :value="String(s)">{{ s }}×</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Switch
        v-model="autoplay"
        class="max-sm:h-11"
        data-control="autoplay"
        :label="t('transport.autostart')"
        :on-label="t('switch.on')"
        :off-label="t('switch.off')"
      />
      <p class="text-muted-foreground text-xs leading-4">{{ t('transport.autostartHint') }}</p>
    </PopoverContent>
  </Popover>
</template>
