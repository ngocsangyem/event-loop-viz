import type { NarratedStep } from './narrate-trace'

/**
 * "Under the hood" notes a step can open: what the specs or MDN say about the mechanism the step
 * shows. Each note's words (drive.info.<key>) restate a passage checked against its source, listed
 * in plans/reports/researcher-2026-10-22-event-loop-under-the-hood-sources.md.
 */
export const DRIVE_INFO_SOURCES = {
  callStack: { source: 'ECMA-262 · Execution contexts', url: 'https://tc39.es/ecma262/#sec-execution-contexts' },
  console: { source: 'Console Standard · Printer', url: 'https://console.spec.whatwg.org/#printer' },
  setTimeout: { source: 'HTML · Timer initialization steps', url: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-initialisation-steps' },
  timerClamp: { source: 'HTML · Timer initialization steps', url: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-initialisation-steps' },
  eventLoop: { source: 'HTML · Event loop processing model', url: 'https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model' },
  checkpoint: { source: 'HTML · Perform a microtask checkpoint', url: 'https://html.spec.whatwg.org/multipage/webappapis.html#perform-a-microtask-checkpoint' },
  promiseJobs: { source: 'ECMA-262 · PerformPromiseThen', url: 'https://tc39.es/ecma262/#sec-performpromisethen' },
  await: { source: 'ECMA-262 · Await', url: 'https://tc39.es/ecma262/#await' },
  thenable: { source: 'ECMA-262 · Promise Resolve Functions', url: 'https://tc39.es/ecma262/#sec-promise-resolve-functions' },
  asyncGenerator: { source: 'ECMA-262 · Yield', url: 'https://tc39.es/ecma262/#sec-yield' },
  postMessage: { source: 'HTML · Message ports', url: 'https://html.spec.whatwg.org/multipage/web-messaging.html#message-ports' },
  unhandledRejection: { source: 'HTML · Notify about rejected promises', url: 'https://html.spec.whatwg.org/multipage/webappapis.html#notify-about-rejected-promises' },
  busyLoop: { source: 'MDN · setTimeout, late timeouts', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout#late_timeouts' },
} as const

export type DriveInfoKey = keyof typeof DRIVE_INFO_SOURCES

/** The note a kind of step explains; a walkthrough shows each note on its first such step only. */
export function infoKeyFor(step: NarratedStep): DriveInfoKey | null {
  switch (step.variant) {
    case 'scriptStart':
      return 'callStack'
    case 'builtinCall':
      return String(step.params.name).startsWith('console.') ? 'console' : null
    case 'builtinCall.repeated':
      return 'busyLoop'
    case 'timer':
    case 'timer.repeat':
      return 'setTimeout'
    case 'timer.clamped':
      return 'timerClamp'
    case 'checkpoint':
    case 'checkpoint.empty':
      return 'checkpoint'
    case 'jobQueued.function':
    case 'jobQueued.reject':
      return 'promiseJobs'
    case 'jobQueued.thenable':
      return 'thenable'
    case 'await':
      return 'await'
    case 'genResume':
    case 'genYield':
      return 'asyncGenerator'
    case 'taskQueued.port-message':
      return 'postMessage'
    case 'taskQueued.dom-manipulation':
    case 'rejectionReport.unhandled':
      return 'unhandledRejection'
    default:
      return step.kind === 'taskStart' ? 'eventLoop' : null
  }
}
