import { computed, ref, shallowRef, watch } from 'vue'
import { scanUnsupportedApis } from '@/runner/unsupported-api-scan'
import { startWorkerRun } from '@/runner/worker-run-client'
import type { WorkerRun } from '@/runner/worker-run-client'
import type { SharedSettings } from '@/share/share-link-codec'
import { createPlayer } from '@/player/player'
import { createInitialState } from '@/player/replay-state'
import { withStepOptions } from '@/player/with-step-options'
import type { Trace } from '@/trace/trace-event'

const DEFAULT_SCRIPT = "setTimeout(() => console.log('timer'), 10)\nconsole.log('sync')"

/**
 * The Script, its Run settings, the Run in flight and the Trace it produced, plus everything
 * derived from the Trace at the playhead. The Trace is immutable; `position` is the only
 * replay state, and the player folds events so the UI never does.
 */
export function useRunSession(options: {
  initial?: { script: string; settings: SharedSettings }
  /** Called after every Run ends (success, failure or cancel), once `running` is false. */
  onSettled?: () => void
  /** Overrides the 30 s wall-clock watchdog; lets tests shorten it. */
  watchdogMs?: number
}) {
  const script = ref(options.initial?.script ?? DEFAULT_SCRIPT)
  /** Run settings travel with a share link so the recipient reproduces the same Trace. */
  const settings = ref<SharedSettings>(options.initial?.settings ?? {})
  // Shallow: the Trace is immutable and large, deep proxies would only cost.
  const trace = shallowRef<Trace | null>(null)
  const syntaxError = ref<string | null>(null)
  /** Where the engine rejected the Script; drives the editor marker. Cleared on edit. */
  const syntaxErrorAt = ref<{ line: number; column: number } | null>(null)
  const position = ref(0)
  const running = ref(false)
  /** "Show all events" makes Bookkeeping Events steppable, not only visible in the list. */
  const showAll = ref(false)
  let activeRun: WorkerRun | null = null

  const events = computed(() => trace.value?.events ?? [])
  /** The Run's Halt, if a Budget ended it; the final event of a Trace. */
  const halt = computed(() => {
    const last = events.value[events.value.length - 1]
    return last?.k === 'run:halted' ? { reason: last.reason, limit: last.limit } : null
  })
  const replaying = computed(() => trace.value !== null)
  const player = computed(() =>
    trace.value ? withStepOptions(createPlayer(trace.value), { showAll: showAll.value }) : null,
  )
  const replayState = computed(() => player.value?.stateAt(position.value) ?? createInitialState())
  const consoleOutput = computed(() => replayState.value.console)
  // Source ranges at the playhead; host-internal events carry none, which clears the highlight.
  const sourceHighlight = computed(() =>
    player.value
      ? { source: replayState.value.sourceRange, cause: replayState.value.causeRange }
      : null,
  )
  // One step earlier, for the Scene's transitions; null at the first step or before a Run.
  const previousReplayState = computed(() => {
    const current = player.value
    if (!current) return null
    const before = current.prev(position.value)
    return before === position.value ? null : current.stateAt(before)
  })
  // During replay the Trace header is authoritative; before a Run the live scan of the editor text.
  const unsupportedApis = computed(() =>
    trace.value ? trace.value.header.unsupportedApis : scanUnsupportedApis(script.value),
  )

  // Hiding Bookkeeping Events must not leave the playhead parked on one.
  watch(showAll, (on) => {
    if (!on && player.value) position.value = player.value.seek(position.value)
  })
  watch(script, () => {
    syntaxErrorAt.value = null
  })

  /** Editing ends the replay: the Trace belongs to the Script that produced it. */
  function discardTrace() {
    trace.value = null
    position.value = 0
  }

  async function run() {
    // The editor shortcut can fire while a Run is in flight.
    if (running.value) return
    syntaxError.value = null
    syntaxErrorAt.value = null
    discardTrace()
    running.value = true
    // Plain copy: reactive proxies cannot be posted to a Worker.
    const plainSettings = JSON.parse(JSON.stringify(settings.value)) as SharedSettings
    activeRun = startWorkerRun(script.value, plainSettings, { watchdogMs: options.watchdogMs })
    try {
      const result = await activeRun.result
      if (result.kind === 'ran') {
        trace.value = result.trace
        position.value = player.value?.first() ?? 0
      } else if (result.kind === 'syntax-error') {
        syntaxError.value = `${result.message} (line ${result.line}, column ${result.column})`
        syntaxErrorAt.value = { line: result.line, column: result.column }
      } else if (result.kind === 'watchdog-killed') {
        syntaxError.value =
          'The run was stopped by the watchdog: it took too long, so no Trace exists.'
      }
    } catch (error) {
      syntaxError.value = `The run could not start: ${error instanceof Error ? error.message : error}`
    } finally {
      running.value = false
      activeRun = null
      options.onSettled?.()
    }
  }

  return {
    script,
    settings,
    trace,
    syntaxError,
    syntaxErrorAt,
    position,
    running,
    showAll,
    events,
    halt,
    replaying,
    player,
    replayState,
    consoleOutput,
    sourceHighlight,
    previousReplayState,
    unsupportedApis,
    discardTrace,
    run,
    cancel: () => activeRun?.cancel(),
  }
}
