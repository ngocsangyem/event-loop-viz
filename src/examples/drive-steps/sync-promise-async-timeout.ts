import type { CuratedDriveNote } from './curated-drive-step'

/** Why notes for the `sync-promise-async-timeout` walkthrough. Words: `drive.examples.syncPromiseAsyncTimeout.*`. */
export const syncPromiseAsyncTimeout: readonly CuratedDriveNote[] = [
  { key: 'timerWaits', at: { k: 'timer:init' } },
  { key: 'asyncOrder', at: { k: 'await:suspend' } },
  { key: 'jobsFirst', at: { k: 'checkpoint:begin' } },
  { key: 'promiseBeforeAwait', at: { k: 'console', text: 'promise 1' } },
  { key: 'finalOrder', at: { k: 'task:begin', nth: 2 } },
]
