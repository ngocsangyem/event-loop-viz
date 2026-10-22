import type { CuratedDriveStep } from './curated-drive-step'

/** Drive me for the `async-generators` example. Words: `drive.examples.asyncGenerators.*`. */
export const asyncGenerators: readonly CuratedDriveStep[] = [
  { key: 'scriptOnStack', at: { k: 'frame:push', where: { label: 'script' } }, target: 'call-stack' },
  { key: 'createGen', at: { k: 'frame:push', where: { label: 'g' } }, target: 'call-stack' },
  { key: 'callNext', at: { k: 'console', text: 'call next' }, target: 'source', line: 4 },
  { key: 'bodyRuns', at: { k: 'frame:push', where: { label: 'g' }, nth: 2 }, target: 'call-stack' },
  { key: 'gStart', at: { k: 'console', text: 'g:start' }, target: 'source', line: 2 },
  { key: 'yieldAwaits', at: { k: 'await:suspend' }, target: 'microtask-queue' },
  { key: 'syncEnd', at: { k: 'console', text: 'sync end' }, target: 'source', line: 6 },
  { key: 'checkpoint', at: { k: 'checkpoint:begin' }, target: 'event-loop' },
  { key: 'resumeStack', at: { k: 'frame:push', where: { label: 'g' }, after: { k: 'job:begin' } }, target: 'call-stack' },
  { key: 'yieldSettles', at: { k: 'asyncgen:yield' }, target: 'microtask-queue' },
  { key: 'thenStack', at: { k: 'frame:push', where: { label: '(anonymous)' }, after: { k: 'job:begin', nth: 2 } }, target: 'call-stack' },
  { key: 'resolved', at: { k: 'console', text: 'next resolved v' }, target: 'console' },
]
