import type { TraceEvent } from '../trace/trace-event'

/** What the detail pane shows about one event; derived purely from the Trace. */
export interface EventExplanation {
  /** Plain-language account of what happened and why. */
  text: string
  /** Spec step the event implements, with a URL into the ES or HTML spec. */
  spec: { label: string; url: string }
}

/** `ES:#sec-x` / `HTML:event-loop` -> a labelled link into the matching spec. */
export function specLink(ref: TraceEvent['ref']): EventExplanation['spec'] {
  const colon = ref.indexOf(':')
  const spec = ref.slice(0, colon)
  const anchor = ref.slice(colon + 1).replace(/^#/, '')
  const base = spec === 'ES' ? 'https://tc39.es/ecma262/' : 'https://html.spec.whatwg.org/'
  return { label: `${spec} ${anchor}`, url: `${base}#${anchor}` }
}

/** Name things by where the Script created them, falling back to their id. */
interface Namer {
  promise(pid: string): string
  timer(tid: string): string
}

function makeNamer(events: readonly TraceEvent[], at: number): Namer {
  const lineWhere = (test: (e: TraceEvent) => boolean): number | undefined => {
    for (let i = Math.min(at, events.length - 1); i >= 0; i--) {
      const e = events[i]!
      if (e.loc && test(e)) return e.loc.line
    }
    return undefined
  }
  return {
    promise(pid) {
      const line = lineWhere(
        (e) =>
          e.k !== 'promise:reaction' && e.k !== 'rejection:track' && 'pid' in e && e.pid === pid,
      )
      return line === undefined ? `Promise ${pid}` : `The promise from line ${line}`
    },
    timer(tid) {
      const line = lineWhere((e) => e.k === 'timer:init' && e.tid === tid)
      return line === undefined ? `timer ${tid}` : `the timer set on line ${line}`
    },
  }
}

/**
 * Plain-language explanation of an event from its kind and payload. `events` is the whole
 * Trace, used to name promises and timers by the line that created them.
 */
export function explainEvent(event: TraceEvent, events: readonly TraceEvent[]): EventExplanation {
  return { text: describe(event, makeNamer(events, event.seq)), spec: specLink(event.ref) }
}

function describe(e: TraceEvent, name: Namer): string {
  switch (e.k) {
    case 'run:start':
      return 'The Run starts: the Script is evaluated as the first Task.'
    case 'run:halted':
      return e.reason === 'natural'
        ? 'The Run ends naturally: no Tasks or Jobs are left to run.'
        : `The Run was halted because the ${e.reason} Budget${e.limit === undefined ? '' : ` (${e.limit})`} ran out; nothing after this point was executed.`
    case 'task:queue':
      return `A Task (${e.taskId}) was queued by ${taskSource(e.source)}${e.dueUs === undefined ? '' : `, due at ${e.dueUs / 1000} ms of virtual time`}. It runs when the call stack is empty and the event loop picks it.`
    case 'task:begin':
      return `The event loop starts running Task ${e.taskId}.`
    case 'task:end':
      return `Task ${e.taskId} finished. A Checkpoint follows before the next Task.`
    case 'checkpoint:begin':
      return `A Checkpoint begins (${checkpointReason(e.reason)}): every queued Job runs now, including Jobs queued by other Jobs, before anything else.`
    case 'checkpoint:end':
      return `The Checkpoint ends (${checkpointReason(e.reason)}): the Job queue is empty.`
    case 'job:enqueue':
      return `A Job (${e.jobId}) was queued to ${jobWork(e, name)}. It runs at the next Checkpoint, not now.`
    case 'job:begin':
      return `Job ${e.jobId} starts. Jobs run to completion one at a time.`
    case 'job:end':
      return `Job ${e.jobId} finished; the next queued Job, if any, runs.`
    case 'frame:push':
      return e.builtin
        ? `The engine enters the built-in function ${e.label}.`
        : `The call to ${e.label} begins and is pushed on the call stack.`
    case 'frame:pop':
      return e.builtin
        ? `The built-in function ${e.label} returns.`
        : `${e.label} returns and is popped off the call stack.`
    case 'timer:init':
      return `Timer ${e.tid} was set for ${e.requestedMs} ms${e.clampedMs !== e.requestedMs ? `, raised to ${e.clampedMs} ms because deeply nested timers wait at least 4 ms (nesting level ${e.nesting})` : ''}${e.repeat ? ', repeating' : ''}. Its callback becomes a Task once that much virtual time passes.`
    case 'timer:fire':
      return `Time is up for ${name.timer(e.tid)}, so its callback runs as a Task.`
    case 'timer:clear':
      return `${capitalize(name.timer(e.tid))} was cleared, so its callback will not run.`
    case 'promise:create':
      return `A new promise (${e.pid}) was created, initially pending.`
    case 'promise:reaction':
      return `${name.promise(e.pid)} got a ${viaWork(e.via)} reaction. ${e.pending ? 'It is still pending, so the reaction waits until the promise settles.' : 'It had already settled, so the reaction is queued as a Job right away.'}`
    case 'promise:resolve':
      return e.with === 'thenable'
        ? `${name.promise(e.pid)} was resolved with a thenable, so a Job is queued to call its then method; the promise stays pending until that Job runs.`
        : e.with === 'self'
          ? `${name.promise(e.pid)} was resolved with itself, which is a TypeError, so it rejects.`
          : `${name.promise(e.pid)} was resolved with a plain value, so it settles right away.`
    case 'promise:settle':
      return `${name.promise(e.pid)} ${e.state}, so its reactions are queued as Jobs that run at the next Checkpoint.`
    case 'await:suspend':
      return `The async function ${e.fid} paused at await${e.awaitedPid ? `, waiting for ${lower(name.promise(e.awaitedPid))}` : ''}. It continues in a Job once the awaited promise settles.`
    case 'await:resume':
      return `The async function ${e.fid} resumed after await${e.mode === 'throw' ? ' because the awaited promise rejected, so the await throws' : e.mode === 'next' ? ' with the fulfilled value' : ''}.`
    case 'asyncgen:yield':
      return `The async generator ${e.gid} yielded a value to its consumer and pauses until the next request.`
    case 'asyncgen:resume':
      return `The async generator ${e.gid} continues running for the next request.`
    case 'asyncgen:return-await':
      return `The async generator ${e.gid} awaits the value passed to return() before finishing.`
    case 'rejection:track':
      return e.op === 'reject'
        ? `${name.promise(e.pid)} rejected with no handler attached, so the host starts tracking it as possibly unhandled.`
        : `A handler was attached to ${lower(name.promise(e.pid))} after it rejected, so it is no longer tracked as unhandled.`
    case 'rejection:notify':
      return e.outcome === 'unhandled'
        ? `No handler was attached in time, so ${lower(name.promise(e.pid))} is reported as an unhandled rejection: ${e.message}`
        : `A handler was attached late, so the host reports rejectionhandled for ${lower(name.promise(e.pid))}: ${e.message}`
    case 'exception:report':
      return `An exception escaped ${exceptionOrigin(e.origin)} and was reported to the console: ${e.message}${e.unsupportedApi ? ` (${e.unsupportedApi} is not supported in v1)` : ''}`
    case 'console':
      return `console.${e.level} printed ${JSON.stringify(e.text)}.`
  }
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const lower = (s: string) => s.replace(/^The /, 'the ')

function taskSource(source: 'script' | 'timer' | 'port-message' | 'dom-manipulation'): string {
  switch (source) {
    case 'script':
      return 'the initial Script'
    case 'timer':
      return 'a timer'
    case 'port-message':
      return 'a MessagePort message'
    case 'dom-manipulation':
      return 'the browser (a rejection notification)'
  }
}

function checkpointReason(reason: 'task-end' | 'script-end' | 'callback-end'): string {
  switch (reason) {
    case 'task-end':
      return 'the Task ended'
    case 'script-end':
      return 'the Script finished'
    case 'callback-end':
      return 'a callback returned with an empty stack'
  }
}

function jobWork(e: Extract<TraceEvent, { k: 'job:enqueue' }>, name: Namer): string {
  const target = e.pid ? lower(name.promise(e.pid)) : 'a promise'
  switch (e.jobKind) {
    case 'reaction':
      return `run the ${e.outcome === 'reject' ? 'rejection' : 'fulfillment'} reaction of ${target}`
    case 'thenable':
      return `call the then method of the thenable that ${target} was resolved with`
    case 'microtask':
      return 'run a queueMicrotask callback'
  }
}

function viaWork(via: 'then' | 'await' | 'asyncgen' | 'from-sync'): string {
  switch (via) {
    case 'then':
      return '.then'
    case 'await':
      return 'await'
    case 'asyncgen':
      return 'async generator'
    case 'from-sync':
      return 'for-await (sync iterable)'
  }
}

function exceptionOrigin(origin: 'script' | 'task-callback' | 'microtask-callback'): string {
  switch (origin) {
    case 'script':
      return 'the Script'
    case 'task-callback':
      return 'a Task callback'
    case 'microtask-callback':
      return 'a Job callback'
  }
}
