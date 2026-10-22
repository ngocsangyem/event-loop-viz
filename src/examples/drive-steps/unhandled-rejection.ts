import type { CuratedDriveStep } from './curated-drive-step'

/** Drive me for the `unhandled-rejection` example. Words: `drive.examples.unhandledRejection.*`. */
export const unhandledRejection: readonly CuratedDriveStep[] = [
  { key: 'scriptOnStack', at: { k: 'frame:push', where: { label: 'script' } }, target: 'call-stack' },
  { key: 'reject', at: { k: 'promise:settle', where: { state: 'rejected' } }, target: 'source', line: 2 },
  { key: 'timer', at: { k: 'timer:init' }, target: 'web-apis' },
  { key: 'job', at: { k: 'job:enqueue' }, target: 'microtask-queue' },
  { key: 'checkpoint', at: { k: 'checkpoint:begin' }, target: 'event-loop' },
  { key: 'jobStack', at: { k: 'frame:push', where: { label: '(anonymous)' }, after: { k: 'job:begin' } }, target: 'call-stack' },
  { key: 'reportTask', at: { k: 'task:queue', nth: 2 }, target: 'task-queue' },
  { key: 'reported', at: { k: 'rejection:notify' }, target: 'console' },
  { key: 'timerTask', at: { k: 'task:begin', nth: 3 }, target: 'event-loop' },
  { key: 'timerLog', at: { k: 'console', text: 'timer 50' }, target: 'console' },
]
