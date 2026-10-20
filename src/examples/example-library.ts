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
]

export function findExample(id: string): Example | undefined {
  return EXAMPLES.find((example) => example.id === id)
}
