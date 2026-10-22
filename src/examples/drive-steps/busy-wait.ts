import type { CuratedDriveNote } from './curated-drive-step'

/** Why notes for the `busy-wait` walkthrough. Words: `drive.examples.busyWait.*`. */
export const busyWait: readonly CuratedDriveNote[] = [
  { key: 'clockMoves', at: { k: 'frame:push', where: { label: 'now' }, nth: 2 } },
  { key: 'stillJobsFirst', at: { k: 'checkpoint:begin' } },
  { key: 'late', at: { k: 'task:begin', nth: 2 } },
]
