import type { CuratedDriveStep } from './curated-drive-step'

/** Drive me for the `thenables` example. Words: `drive.examples.thenables.*`. */
export const thenables: readonly CuratedDriveStep[] = [
  { key: 'scriptOnStack', at: { k: 'frame:push', where: { label: 'script' } }, target: 'call-stack' },
  { key: 'thenableJob', at: { k: 'job:enqueue' }, target: 'microtask-queue' },
  { key: 'chainJob', at: { k: 'job:enqueue', nth: 2 }, target: 'microtask-queue' },
  { key: 'checkpoint', at: { k: 'checkpoint:begin' }, target: 'event-loop' },
  { key: 'thenStack', at: { k: 'frame:push', where: { label: 'then' }, after: { k: 'job:begin' } }, target: 'call-stack' },
  { key: 'tick1', at: { k: 'console', text: 'tick 1' }, target: 'console' },
  { key: 'resumeStack', at: { k: 'frame:push', where: { label: '(anonymous)' }, after: { k: 'job:begin', nth: 3 } }, target: 'call-stack' },
  { key: 'resumes', at: { k: 'console', text: 'await thenable' }, target: 'source', line: 3 },
  { key: 'tick2', at: { k: 'console', text: 'tick 2' }, target: 'console' },
  { key: 'tick3', at: { k: 'console', text: 'tick 3' }, target: 'console' },
]
