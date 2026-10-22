<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

/**
 * The card of one Drive me step: `STEP 03 OF 07`, the title, the explanation, and
 * [P]PREV · [ESC]END · [N]NEXT. A non-modal dialog: the page stays readable around it, and the
 * body is a polite live region so each new step is read out. The default slot replaces the body
 * (a loading line or an error while steps are being prepared).
 */
const props = defineProps<{ index: number; total: number; title: string; body: string }>()
const emit = defineEmits<{ next: []; prev: []; end: [] }>()
const { t } = useI18n()
const titleId = useId()

const pad = (n: number) => String(n).padStart(2, '0')
const progress = computed(() => t('drive.progress', { current: pad(props.index + 1), total: pad(props.total) }))
const last = computed(() => props.index >= props.total - 1)
/** With no steps (loading, none fit, a failure) the card is a notice: no progress and no Prev/Next. */
const stepping = computed(() => props.total > 0)
</script>

<template>
  <section
    role="dialog"
    aria-modal="false"
    :aria-labelledby="titleId"
    tabindex="-1"
    class="bg-raised border-border text-popover-foreground flex w-[min(360px,calc(100vw-32px))] flex-col gap-3 border p-4 outline-none"
    data-testid="drive-popover"
    @keydown.esc.stop.prevent="emit('end')"
  >
    <p v-if="stepping" class="text-brand-text font-mono text-xs font-medium tracking-[0.02em] uppercase tabular-nums" data-testid="drive-progress">
      {{ progress }}
    </p>
    <h2 :id="titleId" class="text-foreground text-[15px] leading-5 font-semibold">{{ title }}</h2>
    <div aria-live="polite" class="text-foreground-2 text-sm leading-[1.55]">
      <slot>{{ body }}</slot>
    </div>
    <div class="flex items-center gap-2 pt-1">
      <Button v-if="stepping" variant="secondary" size="sm" hotkey="P" class="max-sm:h-11!" :disabled="index === 0" data-testid="drive-prev" @click="emit('prev')">
        {{ t('drive.prev') }}
      </Button>
      <Button variant="ghost" size="sm" hotkey="ESC" class="ml-auto max-sm:h-11!" data-testid="drive-end" @click="emit('end')">
        {{ t('drive.end') }}
      </Button>
      <Button v-if="stepping" size="sm" hotkey="N" class="max-sm:h-11!" data-testid="drive-next" @click="last ? emit('end') : emit('next')">
        {{ last ? t('drive.done') : t('drive.next') }}
      </Button>
    </div>
  </section>
</template>
