import type { TraceEvent } from '../trace/trace-event'
import type { ExplainPhrases } from './explain-phrases-types'

const taskSource = (source: 'script' | 'timer' | 'port-message' | 'dom-manipulation'): string => {
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

const checkpointReason = (reason: 'task-end' | 'script-end' | 'callback-end'): string => {
  switch (reason) {
    case 'task-end':
      return 'the Task ended'
    case 'script-end':
      return 'the Script finished'
    case 'callback-end':
      return 'a callback returned with an empty stack'
  }
}

const viaWork = (via: 'then' | 'await' | 'asyncgen' | 'from-sync'): string => {
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

const exceptionOrigin = (origin: 'script' | 'task-callback' | 'microtask-callback'): string => {
  switch (origin) {
    case 'script':
      return 'the Script'
    case 'task-callback':
      return 'a Task callback'
    case 'microtask-callback':
      return 'a Job callback'
  }
}

type JobEnqueue = Extract<TraceEvent, { k: 'job:enqueue' }>

export const EN_PHRASES: ExplainPhrases = {
  promiseRef: (pid, line, atStart) =>
    line === undefined ? `Promise ${pid}` : `${atStart ? 'The' : 'the'} promise from line ${line}`,
  timerRef: (tid, line, atStart) =>
    line === undefined
      ? `${atStart ? 'Timer' : 'timer'} ${tid}`
      : `${atStart ? 'The' : 'the'} timer set on line ${line}`,
  describe: {
    'run:start': () => 'The Run starts: the Script is evaluated as the first Task.',
    'run:halted': (e) =>
      e.reason === 'natural'
        ? 'The Run ends naturally: no Tasks or Jobs are left to run.'
        : `The Run was halted because the ${e.reason} Budget${e.limit === undefined ? '' : ` (${e.limit})`} ran out; nothing after this point was executed.`,
    'task:queue': (e, name) =>
      e.source === 'timer' && e.tid !== undefined
        ? `Time is up for ${name.timer(e.tid)}: its callback joins the Task Queue as Task ${e.taskId}. It runs when the call stack is empty and the event loop picks it.`
        : `A Task (${e.taskId}) was queued by ${taskSource(e.source)}${e.dueUs === undefined ? '' : `, due at ${e.dueUs / 1000} ms of virtual time`}. It runs when the call stack is empty and the event loop picks it.`,
    'task:begin': (e) => `The event loop starts running Task ${e.taskId}.`,
    'task:end': (e) => `Task ${e.taskId} finished. A Checkpoint follows before the next Task.`,
    'checkpoint:begin': (e) =>
      `A Checkpoint begins (${checkpointReason(e.reason)}): every queued Job runs now, including Jobs queued by other Jobs, before anything else.`,
    'checkpoint:end': (e) =>
      `The Checkpoint ends (${checkpointReason(e.reason)}): the Job queue is empty.`,
    'job:enqueue': (e, name) =>
      `A Job (${e.jobId}) was queued to ${jobWork(e, name.promiseInline)}. It runs at the next Checkpoint, not now.`,
    'job:begin': (e) => `Job ${e.jobId} starts. Jobs run to completion one at a time.`,
    'job:end': (e) => `Job ${e.jobId} finished; the next queued Job, if any, runs.`,
    'frame:push': (e) =>
      e.builtin
        ? `The engine enters the built-in function ${e.label}.`
        : `The call to ${e.label} begins and is pushed on the call stack.`,
    'frame:pop': (e) =>
      e.builtin
        ? `The built-in function ${e.label} returns.`
        : `${e.label} returns and is popped off the call stack.`,
    'timer:init': (e) =>
      `Timer ${e.tid} was set for ${e.requestedMs} ms${e.clampedMs !== e.requestedMs ? `, raised to ${e.clampedMs} ms because deeply nested timers wait at least 4 ms (nesting level ${e.nesting})` : ''}${e.repeat ? ', repeating' : ''}. Its callback becomes a Task once that much virtual time passes.`,
    'timer:fire': (e, name) =>
      `The event loop picks ${name.timer(e.tid)}'s Task; its callback runs now.`,
    'timer:clear': (e, name) =>
      `${name.timerStart(e.tid)} was cleared, so its callback will not run.`,
    'promise:create': (e) => `A new promise (${e.pid}) was created, initially pending.`,
    'promise:reaction': (e, name) =>
      `${name.promise(e.pid)} got a ${viaWork(e.via)} reaction. ${e.pending ? 'It is still pending, so the reaction waits until the promise settles.' : 'It had already settled, so the reaction is queued as a Job right away.'}`,
    'promise:resolve': (e, name) =>
      e.with === 'thenable'
        ? `${name.promise(e.pid)} was resolved with a thenable, so a Job is queued to call its then method; the promise stays pending until that Job runs.`
        : e.with === 'self'
          ? `${name.promise(e.pid)} was resolved with itself, which is a TypeError, so it rejects.`
          : `${name.promise(e.pid)} was resolved with a plain value, so it settles right away.`,
    'promise:settle': (e, name) =>
      `${name.promise(e.pid)} ${e.state}, so its reactions are queued as Jobs that run at the next Checkpoint.`,
    'await:suspend': (e, name) =>
      `The async function ${e.fid} paused at await${e.awaitedPid ? `, waiting for ${name.promiseInline(e.awaitedPid)}` : ''}. It continues in a Job once the awaited promise settles.`,
    'await:resume': (e) =>
      `The async function ${e.fid} resumed after await${e.mode === 'throw' ? ' because the awaited promise rejected, so the await throws' : e.mode === 'next' ? ' with the fulfilled value' : ''}.`,
    'asyncgen:yield': (e) =>
      `The async generator ${e.gid} yielded a value to its consumer and pauses until the next request.`,
    'asyncgen:resume': (e) =>
      `The async generator ${e.gid} continues running for the next request.`,
    'asyncgen:return-await': (e) =>
      `The async generator ${e.gid} awaits the value passed to return() before finishing.`,
    'rejection:track': (e, name) =>
      e.op === 'reject'
        ? `${name.promise(e.pid)} rejected with no handler attached, so the host starts tracking it as possibly unhandled.`
        : `A handler was attached to ${name.promiseInline(e.pid)} after it rejected, so it is no longer tracked as unhandled.`,
    'rejection:notify': (e, name) =>
      e.outcome === 'unhandled'
        ? `No handler was attached in time, so ${name.promiseInline(e.pid)} is reported as an unhandled rejection: ${e.message}`
        : `A handler was attached late, so the host reports rejectionhandled for ${name.promiseInline(e.pid)}: ${e.message}`,
    'exception:report': (e) =>
      `An exception escaped ${exceptionOrigin(e.origin)} and was reported to the console: ${e.message}${e.unsupportedApi ? ` (${e.unsupportedApi} is not supported in v1)` : ''}`,
    console: (e) => `console.${e.level} printed ${JSON.stringify(e.text)}.`,
  },
}

function jobWork(e: JobEnqueue, promiseInline: (pid: string) => string): string {
  const target = e.pid ? promiseInline(e.pid) : 'a promise'
  switch (e.jobKind) {
    case 'reaction':
      return `run the ${e.outcome === 'reject' ? 'rejection' : 'fulfillment'} reaction of ${target}`
    case 'thenable':
      return `call the then method of the thenable that ${target} was resolved with`
    case 'microtask':
      return 'run a queueMicrotask callback'
  }
}
