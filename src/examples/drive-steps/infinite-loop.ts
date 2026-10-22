import type { CuratedDriveStep } from './curated-drive-step'

/** Drive me for the `infinite-loop` example. Words: `drive.examples.infiniteLoop.*`. */
export const infiniteLoop: readonly CuratedDriveStep[] = [
  { key: 'scriptOnStack', at: { k: 'frame:push', where: { label: 'script' } }, target: 'call-stack' },
  { key: 'start', at: { k: 'console', text: 'start' }, target: 'source', line: 2 },
  { key: 'halted', at: { k: 'run:halted' }, target: 'source', line: 3 },
]
