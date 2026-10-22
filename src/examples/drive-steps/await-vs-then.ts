import type { CuratedDriveStep } from './curated-drive-step'

/** Drive me for the `await-vs-then` example. Words: `drive.examples.awaitVsThen.*`. */
export const awaitVsThen: readonly CuratedDriveStep[] = [
  { key: 'scriptOnStack', at: { k: 'frame:push', where: { label: 'script' } }, target: 'call-stack' },
  { key: 'callF', at: { k: 'frame:push', where: { label: 'f' } }, target: 'call-stack' },
  { key: 'awaitQueues', at: { k: 'job:enqueue' }, target: 'microtask-queue' },
  { key: 'thenQueues', at: { k: 'job:enqueue', nth: 2 }, target: 'microtask-queue' },
  { key: 'checkpoint', at: { k: 'checkpoint:begin' }, target: 'event-loop' },
  { key: 'resumeF', at: { k: 'frame:push', where: { label: 'f' }, after: { k: 'job:begin' } }, target: 'call-stack' },
  { key: 'awaitLog', at: { k: 'console', text: 'await' }, target: 'console' },
  { key: 'then1Stack', at: { k: 'frame:push', where: { label: '(anonymous)' }, after: { k: 'job:begin', nth: 2 } }, target: 'call-stack' },
  { key: 'then2Queues', at: { k: 'job:enqueue', nth: 3 }, target: 'microtask-queue' },
  { key: 'then2Stack', at: { k: 'frame:push', where: { label: '(anonymous)' }, after: { k: 'job:begin', nth: 3 } }, target: 'call-stack' },
  { key: 'then2Log', at: { k: 'console', text: 'then2' }, target: 'console' },
]
