import type { CuratedDriveStep } from './curated-drive-step'

/** Drive me for the `busy-wait` example. Words: `drive.examples.busyWait.*`. */
export const busyWait: readonly CuratedDriveStep[] = [
  { key: 'scriptOnStack', at: { k: 'frame:push', where: { label: 'script' } }, target: 'call-stack' },
  { key: 'timer', at: { k: 'timer:init' }, target: 'web-apis' },
  { key: 'due', at: { k: 'task:queue', nth: 2 }, target: 'task-queue' },
  { key: 'busy', at: { k: 'console', text: 'after busy wait' }, target: 'source', line: 4 },
  { key: 'job', at: { k: 'job:enqueue' }, target: 'microtask-queue' },
  { key: 'checkpoint', at: { k: 'checkpoint:begin' }, target: 'event-loop' },
  { key: 'jobLog', at: { k: 'console', text: 'microtask' }, target: 'console' },
  { key: 'timerTask', at: { k: 'task:begin', nth: 2 }, target: 'event-loop' },
  { key: 'timerStack', at: { k: 'frame:push', where: { label: '(anonymous)' }, after: { k: 'task:begin', nth: 2 } }, target: 'call-stack' },
]
