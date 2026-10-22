import type { CuratedDriveStep } from './curated-drive-step'

/** Drive me for the `sync-promise-async-timeout` example. Words: `drive.examples.syncPromiseAsyncTimeout.*`. */
export const syncPromiseAsyncTimeout: readonly CuratedDriveStep[] = [
  { key: 'scriptOnStack', at: { k: 'frame:push', where: { label: 'script' } }, target: 'call-stack' },
  { key: 'start', at: { k: 'console', text: 'start' }, target: 'source', line: 2 },
  { key: 'timer', at: { k: 'timer:init' }, target: 'web-apis' },
  { key: 'timerQueued', at: { k: 'task:queue', nth: 2 }, target: 'task-queue' },
  { key: 'promise', at: { k: 'job:enqueue' }, target: 'microtask-queue' },
  { key: 'asyncRuns', at: { k: 'console', text: 'async that' }, target: 'call-stack' },
  { key: 'awaitPauses', at: { k: 'await:suspend' }, target: 'microtask-queue' },
  { key: 'end', at: { k: 'console', text: 'end' }, target: 'source', line: 10 },
  { key: 'checkpoint', at: { k: 'checkpoint:begin' }, target: 'event-loop' },
  { key: 'job1Stack', at: { k: 'frame:push', where: { label: '(anonymous)' }, after: { k: 'job:begin' } }, target: 'call-stack' },
  { key: 'promise1', at: { k: 'console', text: 'promise 1' }, target: 'console' },
  { key: 'job2Stack', at: { k: 'frame:push', where: { label: '(anonymous)' }, after: { k: 'job:begin', nth: 2 } }, target: 'call-stack' },
  { key: 'asyncEnd', at: { k: 'console', text: 'async end' }, target: 'source', line: 8 },
  { key: 'timerTask', at: { k: 'task:begin', nth: 2 }, target: 'event-loop' },
  { key: 'timerStack', at: { k: 'frame:push', where: { label: '(anonymous)' }, after: { k: 'task:begin', nth: 2 } }, target: 'call-stack' },
  { key: 'timeoutLog', at: { k: 'console', text: 'timeout 1' }, target: 'console' },
]
