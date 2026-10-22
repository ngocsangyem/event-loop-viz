import type { CuratedDriveNote } from './curated-drive-step'

/** Why notes for the `await-vs-then` walkthrough. Words: `drive.examples.awaitVsThen.*`. */
export const awaitVsThen: readonly CuratedDriveNote[] = [
  { key: 'awaitFirst', at: { k: 'job:enqueue' } },
  { key: 'secondThen', at: { k: 'frame:push', where: { label: 'then' }, nth: 2 } },
  { key: 'then2Late', at: { k: 'job:enqueue', nth: 3 } },
]
