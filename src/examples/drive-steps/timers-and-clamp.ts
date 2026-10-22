import type { CuratedDriveStep } from './curated-drive-step'

/** Drive me for the `timers-and-clamp` example. Words: `drive.examples.timersAndClamp.*`. */
export const timersAndClamp: readonly CuratedDriveStep[] = [
  { key: 'scriptOnStack', at: { k: 'frame:push', where: { label: 'script' } }, target: 'call-stack' },
  { key: 'firstTimer', at: { k: 'timer:init' }, target: 'web-apis' },
  { key: 'firstDue', at: { k: 'task:queue', nth: 2 }, target: 'task-queue' },
  { key: 'laterTimer', at: { k: 'timer:init', nth: 2 }, target: 'web-apis' },
  { key: 'firstTask', at: { k: 'task:begin', nth: 2 }, target: 'event-loop' },
  { key: 'stepStack', at: { k: 'frame:push', where: { label: 'step' } }, target: 'call-stack' },
  { key: 'nesting', at: { k: 'timer:init', nth: 3 }, target: 'web-apis' },
  { key: 'clamp', at: { k: 'timer:init', nth: 8 }, target: 'web-apis' },
  { key: 't3', at: { k: 'console', text: 't3' }, target: 'console' },
  { key: 'lastStep', at: { k: 'console', text: 's8' }, target: 'console' },
]
