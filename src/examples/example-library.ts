// Built-in example Scripts. The script text is the Oracle Fixture itself (imported raw), so an
// example cannot drift from what Chrome was recorded to do.
import awaitVsThen from '../../oracle/fixtures/await-vs-then-chain.js?raw'
import timersAndClamp from '../../oracle/fixtures/nested-timeout-clamp.js?raw'
import thenables from '../../oracle/fixtures/await-thenable.js?raw'
import asyncGenerators from '../../oracle/fixtures/async-generator-yield-awaits.js?raw'
import messageChannel from '../../oracle/fixtures/message-channel-vs-timeout.js?raw'
import unhandledRejection from '../../oracle/fixtures/unhandled-rejection-vs-timer.js?raw'
import busyWait from '../../oracle/fixtures/busy-wait-delays-timeout.js?raw'
import infiniteLoop from '../../oracle/fixtures/infinite-loop-halts.js?raw'
import syncPromiseAsyncTimeout from '../../oracle/fixtures/sync-promise-async-timeout.js?raw'
import rafCheckpoint from '../../oracle/fixtures/raf-microtask-checkpoint.js?raw'
import postMessageListeners from '../../oracle/fixtures/window-message-listeners-checkpoint.js?raw'
import clickIsSynchronous from '../../oracle/fixtures/dom-click-is-synchronous.js?raw'
import fetchMockApi from '../../oracle/fixtures/fetch-mock-response.js?raw'
import dynamicImport from '../../oracle/fixtures/module-dynamic-import-data-url.js?raw'
import topLevelAwait from '../../oracle/fixtures/module-top-level-await.js?raw'
import messagePortTransfer from '../../oracle/fixtures/message-port-transfer.js?raw'
import finalizationRegistry from '../../oracle/fixtures/finalization-registry-cleanup-task.js?raw'
import atomicsWaitAsync from '../../oracle/fixtures/atomics-wait-async-notify.js?raw'

export interface Example {
  id: string
  title: string
  /** One line shown next to the title in the picker. */
  description: string
  /** File name in oracle/fixtures/ that holds `script`. */
  fixture: string
  script: string
}

export const EXAMPLES: readonly Example[] = [
  {
    id: 'await-vs-then',
    title: 'await vs then',
    description: 'An awaited promise resumes before a chained then does its second step.',
    fixture: 'await-vs-then-chain.js',
    script: awaitVsThen,
  },
  {
    id: 'sync-promise-async-timeout',
    title: 'Sync, promise, async, timer',
    description: 'Sync code first, then the promise reaction and the await, and the 0 ms timer last.',
    fixture: 'sync-promise-async-timeout.js',
    script: syncPromiseAsyncTimeout,
  },
  {
    id: 'timers-and-clamp',
    title: 'Timers and clamp',
    description: 'Chained 0 ms timers get clamped to 4 ms once nesting gets deep.',
    fixture: 'nested-timeout-clamp.js',
    script: timersAndClamp,
  },
  {
    id: 'thenables',
    title: 'Thenables',
    description: 'Awaiting an object with a then method costs extra microtask ticks.',
    fixture: 'await-thenable.js',
    script: thenables,
  },
  {
    id: 'async-generators',
    title: 'Async generators',
    description: 'yield inside an async generator awaits its operand before resolving next().',
    fixture: 'async-generator-yield-awaits.js',
    script: asyncGenerators,
  },
  {
    id: 'message-channel-vs-timeout',
    title: 'MessageChannel vs setTimeout',
    description: 'A posted message is its own task source and races a 0 ms timer.',
    fixture: 'message-channel-vs-timeout.js',
    script: messageChannel,
  },
  {
    id: 'unhandled-rejection',
    title: 'Unhandled rejection',
    description: 'The rejection is reported after the microtask checkpoint, before a later timer.',
    fixture: 'unhandled-rejection-vs-timer.js',
    script: unhandledRejection,
  },
  {
    id: 'busy-wait',
    title: 'Busy-wait',
    description: 'A blocking loop advances the clock and delays a timer that was already due.',
    fixture: 'busy-wait-delays-timeout.js',
    script: busyWait,
  },
  {
    id: 'infinite-loop',
    title: 'Infinite loop',
    description: 'A runaway loop is stopped by the execution budget instead of freezing the tab.',
    fixture: 'infinite-loop-halts.js',
    script: infiniteLoop,
  },
  {
    id: 'request-animation-frame',
    title: 'requestAnimationFrame',
    description: 'Animation frame callbacks run one by one, each followed by a microtask checkpoint.',
    fixture: 'raf-microtask-checkpoint.js',
    script: rafCheckpoint,
  },
  {
    id: 'post-message-listeners',
    title: 'window.postMessage listeners',
    description: 'The event loop fires the message event: microtasks run between its listeners.',
    fixture: 'window-message-listeners-checkpoint.js',
    script: postMessageListeners,
  },
  {
    id: 'click-is-synchronous',
    title: 'click() runs listeners now',
    description: 'element.click() dispatches on the stack, so microtasks wait until the Script ends.',
    fixture: 'dom-click-is-synchronous.js',
    script: clickIsSynchronous,
  },
  {
    id: 'fetch-mock-api',
    title: 'fetch a (mocked) API',
    description: 'The response arrives as a networking Task after its latency; reading the body takes one more.',
    fixture: 'fetch-mock-response.js',
    script: fetchMockApi,
  },
  {
    id: 'dynamic-import',
    title: 'Dynamic import()',
    description: 'import() loads and evaluates the module in a Task, after the current microtasks.',
    fixture: 'module-dynamic-import-data-url.js',
    script: dynamicImport,
  },
  {
    id: 'top-level-await',
    title: 'Top-level await',
    description: 'A module pauses at await like an async function, letting timers run in between.',
    fixture: 'module-top-level-await.js',
    script: topLevelAwait,
  },
  {
    id: 'message-port-transfer',
    title: 'MessagePort transfer',
    description: 'A transferred port arrives as a new object, still connected to its old partner.',
    fixture: 'message-port-transfer.js',
    script: messagePortTransfer,
  },
  {
    id: 'finalization-registry',
    title: 'gc() and FinalizationRegistry',
    description: 'After gc(), cleanup callbacks run in a Task of their own, after the current microtasks.',
    fixture: 'finalization-registry-cleanup-task.js',
    script: finalizationRegistry,
  },
  {
    id: 'atomics-wait-async',
    title: 'Atomics.waitAsync and notify',
    description: 'Atomics.wait would block, so it throws on the page; waitAsync wakes in a Task queued by notify.',
    fixture: 'atomics-wait-async-notify.js',
    script: atomicsWaitAsync,
  },
]

export function findExample(id: string): Example | undefined {
  return EXAMPLES.find((example) => example.id === id)
}
