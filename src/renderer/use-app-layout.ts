import { computed, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'

export type ModeTab = 'script' | 'replay'

/**
 * The main grid's columns and the phone's SCRIPT / REPLAY tab (DESIGN.md · Layout).
 * Wide screens: Edit is `--col-editor | stage`, Replay is `--col-source | stage | --col-rail` (Source, stage,
 * Why rail); Ask AI takes the right column at --col-ai. A phone shows one tab at a time and
 * follows the Run: a new Trace opens REPLAY, discarding it goes back to SCRIPT.
 */
export function useAppLayout(options: { replaying: Ref<boolean>; askOpen: Ref<boolean> }) {
  const tab = shallowRef<ModeTab>(options.replaying.value ? 'replay' : 'script')
  watch(options.replaying, (on) => (tab.value = on ? 'replay' : 'script'))

  const columns = computed(() => {
    const source = options.replaying.value ? 'var(--col-source)' : 'var(--col-editor)'
    const right = options.askOpen.value ? 'var(--col-ai)' : options.replaying.value ? 'var(--col-rail)' : null
    return [source, 'minmax(0, 1fr)', right].filter(Boolean).join(' ')
  })
  const gridStyle = computed(() => ({ '--app-cols': columns.value }))

  return { tab, gridStyle }
}
