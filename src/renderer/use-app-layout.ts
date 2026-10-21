import { computed, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'

export type ModeTab = 'script' | 'replay'

/**
 * The main grid's columns and the phone's SCRIPT / REPLAY tab (DESIGN.md · Layout).
 * Wide screens: Edit is `600px | stage`, Replay is `320px | stage | 380px` (Source, stage,
 * Why rail); Ask AI takes the right column at 400px. A phone shows one tab at a time and
 * follows the Run: a new Trace opens REPLAY, discarding it goes back to SCRIPT.
 */
export function useAppLayout(options: { replaying: Ref<boolean>; askOpen: Ref<boolean> }) {
  const tab = shallowRef<ModeTab>(options.replaying.value ? 'replay' : 'script')
  watch(options.replaying, (on) => (tab.value = on ? 'replay' : 'script'))

  const columns = computed(() => {
    const source = options.replaying.value ? '320px' : '600px'
    const right = options.askOpen.value ? '400px' : options.replaying.value ? '380px' : null
    return [source, 'minmax(0, 1fr)', right].filter(Boolean).join(' ')
  })
  const gridStyle = computed(() => ({ '--app-cols': columns.value }))

  return { tab, gridStyle }
}
