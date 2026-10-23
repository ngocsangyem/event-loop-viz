<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ExampleVideo } from '@/examples/example-videos'

/**
 * The lesson video of an example, in a modal. The file is only requested once the dialog is open
 * (`preload="none"` until then, no `src` while closed), so the simulator never pays for videos
 * nobody plays. Native controls give pause, seek, fullscreen and keyboard control. Closing, or the
 * video changing (another example, another language), stops playback and releases the file.
 */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ video: ExampleVideo | null; title: string }>()
const { t, locale } = useI18n()

const player = useTemplateRef<HTMLVideoElement>('player')
const status = shallowRef<'loading' | 'ready' | 'error'>('loading')
const src = computed(() => (open.value && props.video ? props.video.src : null))
const otherLanguage = computed(() => props.video !== null && props.video.lang !== locale.value)

/** Stops and unloads the current file so the browser drops its buffer and connection. */
function release() {
  const el = player.value
  if (!el) return
  el.pause()
  el.removeAttribute('src')
  el.load()
}

watch(src, (next, previous) => {
  if (previous && previous !== next) release()
  status.value = 'loading'
})

function retry() {
  const el = player.value
  if (!el || !src.value) return
  status.value = 'loading'
  el.src = src.value
  el.load()
  void el.play().catch(() => {})
}

onBeforeUnmount(release)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="w-[min(1120px,calc(100vw-2rem))] gap-3 p-4" data-testid="example-video-dialog" @close-auto-focus="release">
      <DialogHeader>
        <DialogTitle class="pr-16">{{ t('video.dialogTitle', { title }) }}</DialogTitle>
        <DialogDescription>
          {{ otherLanguage ? t('video.otherLanguage') : t('video.description') }}
        </DialogDescription>
      </DialogHeader>
      <!-- Fixed 16:9 box: the dialog keeps its size while the file loads, so nothing shifts. -->
      <div class="bg-background relative aspect-video w-full">
        <video
          v-if="src"
          ref="player"
          :key="src"
          :src="src"
          class="absolute inset-0 h-full w-full"
          controls
          autoplay
          playsinline
          preload="metadata"
          :lang="video?.lang"
          data-testid="example-video"
          @loadstart="status = 'loading'"
          @waiting="status = 'loading'"
          @canplay="status = 'ready'"
          @playing="status = 'ready'"
          @error="status = 'error'"
        />
        <div
          v-if="status === 'loading'"
          class="text-muted-foreground pointer-events-none absolute inset-0 grid place-items-center font-mono text-xs uppercase"
          role="status"
        >
          {{ t('video.loading') }}
        </div>
        <div v-if="status === 'error'" class="bg-background absolute inset-0 grid place-items-center gap-3 p-6 text-center" role="alert">
          <div class="grid gap-3">
            <p class="text-foreground">{{ t('video.error') }}</p>
            <Button variant="outline" size="sm" class="justify-self-center" @click="retry">{{ t('video.retry') }}</Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
