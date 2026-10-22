import { computed, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import type { Trace } from '../../trace/trace-event'
import type { ModeTab } from '../use-app-layout'
import type { VisualizerView } from '../use-visualizer-view'
import type { ResolvedDriveStep } from './drive-step'

/** Views with every spot a step can light; the 3D Scene has none, so driving switches it to Panels. */
const DRIVABLE_VIEWS: ReadonlySet<VisualizerView> = new Set(['panels', 'diagram'])

/** Where a walkthrough is: getting its steps, showing them, or unable to (none fit, or a failure). */
export type DriveStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export interface DriveSessionOptions {
  trace: Ref<Trace | null>
  position: Ref<number>
  view: Ref<VisualizerView>
  tab: Ref<ModeTab>
  /** Runs the Script when there is no Trace yet, and waits for a Run in flight. */
  ensureRun: () => Promise<void>
  /** Pauses playback: the walkthrough owns the playhead while it moves. */
  pause: () => void
  /** The steps for this Trace; may be slow (the AI) and must stop when `signal` aborts. */
  loadSteps: (trace: Trace, signal: AbortSignal) => Promise<readonly ResolvedDriveStep[]>
}

/**
 * One Drive me walkthrough over the current Trace. Starting runs the Script if needed, loads the
 * steps, pauses playback and shows the REPLAY tab in a view with every spot (Panels or Diagram); ending
 * puts the view and tab back. A new Run or a discarded Trace ends it, since its steps point at the old
 * events. Once started, stepping or scrubbing onto a step's event makes it the current step.
 */
export function useDriveSession(options: DriveSessionOptions) {
  const active = shallowRef(false)
  const status = shallowRef<DriveStatus>('idle')
  const steps = shallowRef<readonly ResolvedDriveStep[]>([])
  const index = shallowRef(0)
  const error = shallowRef<unknown>(null)
  let savedView: VisualizerView | null = null
  let savedTab: ModeTab | null = null
  let driven: Trace | null = null
  let controller: AbortController | null = null

  const step = computed(() => (status.value === 'ready' ? (steps.value[index.value] ?? null) : null))

  function go(i: number) {
    const target = steps.value[i]
    if (!target) return
    options.pause()
    index.value = i
    if (!DRIVABLE_VIEWS.has(options.view.value)) options.view.value = 'panels'
    options.tab.value = 'replay'
    options.position.value = target.position
  }

  async function start() {
    if (active.value) return
    active.value = true
    savedView = options.view.value
    savedTab = options.tab.value
    await load(true)
  }

  /** Gets the steps (running the Script first when asked) and shows the first one. */
  async function load(runFirst: boolean) {
    controller?.abort()
    const mine = (controller = new AbortController())
    status.value = 'loading'
    error.value = null
    try {
      if (runFirst) await options.ensureRun()
      const trace = runFirst ? options.trace.value : driven
      if (mine.signal.aborted) return
      if (!trace) return end()
      driven = trace
      const loaded = await options.loadSteps(trace, mine.signal)
      if (mine.signal.aborted) return
      steps.value = loaded
      status.value = loaded.length > 0 ? 'ready' : 'empty'
      if (loaded.length > 0) go(0)
    } catch (failure) {
      if (mine.signal.aborted) return
      error.value = failure
      status.value = 'error'
    }
  }

  /** After a failure (or connecting a key), tries the same Trace again. */
  const retry = () => (active.value && driven ? load(false) : Promise.resolve())

  function end() {
    if (!active.value) return
    controller?.abort()
    controller = null
    active.value = false
    status.value = 'idle'
    steps.value = []
    index.value = 0
    driven = null
    if (savedView) options.view.value = savedView
    // The Script tab only makes sense while there is still a Trace to come back to.
    if (savedTab && options.trace.value) options.tab.value = savedTab
    savedView = null
    savedTab = null
  }

  const toggle = () => (active.value ? end() : void start())
  const next = () => go(Math.min(index.value + 1, steps.value.length - 1))
  const prev = () => go(Math.max(index.value - 1, 0))

  // The steps belong to one Trace: a new Run or Edit (which discards it) ends the walkthrough.
  watch(options.trace, (trace) => {
    if (active.value && driven !== null && trace !== driven) end()
  })
  watch(options.position, (position) => {
    if (status.value !== 'ready' || steps.value[index.value]?.position === position) return
    const found = steps.value.findIndex((s) => s.position === position)
    if (found !== -1) index.value = found
  })

  return { active, status, steps, index, step, error, start, end, toggle, next, prev, retry }
}

export type DriveSession = ReturnType<typeof useDriveSession>
