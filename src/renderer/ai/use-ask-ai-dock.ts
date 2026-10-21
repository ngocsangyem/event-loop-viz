import { computed, shallowRef, useTemplateRef } from 'vue'
import type { Ref } from 'vue'
import { until, useElementSize } from '@vueuse/core'

interface AskAiDockOptions {
  running: Ref<boolean>
  hasTrace: () => boolean
  run: () => Promise<unknown>
  position: Ref<number>
  /** Pauses playback when the tour takes over the playhead. */
  pausePlayback: () => void
}

/**
 * Open state, focus return, Run-before-ask and playhead hand-over of the Ask AI assistant,
 * plus the dock height a bottom-sheet panel sits on. Reads the template refs `launcher` and
 * `transportCard` (the dock) of the component that calls it.
 */
export function useAskAiDock(options: AskAiDockOptions) {
  const askOpen = shallowRef(false)
  /** Mounted on first open and kept, so a conversation survives minimizing the panel. */
  const askMounted = shallowRef(false)
  const launcher = useTemplateRef<{ $el: HTMLElement }>('launcher')
  function toggleAsk() {
    askMounted.value = true
    askOpen.value = !askOpen.value
  }
  function focusLauncher() {
    launcher.value?.$el?.focus()
  }
  /** Ask AI needs a Trace to point at; a question before any Run runs the Script first. */
  async function ensureRun() {
    if (options.running.value) await until(options.running).toBe(false)
    if (!options.hasTrace()) await options.run()
  }
  /** The AI tour wins over a running replay: playback pauses, then the replay shows the stop. */
  function seekFromTour(seq: number) {
    options.pausePlayback()
    options.position.value = seq
  }
  /** On narrow screens the panel is a bottom sheet that sits on the pinned dock. */
  const transportCard = useTemplateRef<HTMLElement>('transportCard')
  const { height: transportHeight } = useElementSize(transportCard, undefined, { box: 'border-box' })
  // Before the first measurement, assume the dock's desktop height so nothing overlaps it.
  const dockStyle = computed(() => ({ '--ai-dock': `${Math.round(transportHeight.value || 92)}px` }))

  return { askOpen, askMounted, toggleAsk, focusLauncher, ensureRun, seekFromTour, dockStyle }
}
