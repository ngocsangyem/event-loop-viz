import type { CuratedDriveNote } from './curated-drive-step'

/** Why notes for the `atomics-wait-async` walkthrough. Words: `drive.examples.atomicsWaitAsync.*`. */
export const atomicsWaitAsync: readonly CuratedDriveNote[] = [
  { key: 'syncAnswers', at: { k: 'console', text: 'not-equal timed-out' } },
  { key: 'wakeTask', at: { k: 'console', text: 'woke ok' } },
]
