import type { CuratedDriveNote } from './curated-drive-step'

/** Why notes for the `unhandled-rejection` walkthrough. Words: `drive.examples.unhandledRejection.*`. */
export const unhandledRejection: readonly CuratedDriveNote[] = [
  { key: 'notYet', at: { k: 'promise:settle', where: { state: 'rejected' } } },
  { key: 'stillTime', at: { k: 'checkpoint:begin' } },
  { key: 'reportTask', at: { k: 'task:queue', nth: 2 } },
  { key: 'beforeTimer', at: { k: 'rejection:notify' } },
]
