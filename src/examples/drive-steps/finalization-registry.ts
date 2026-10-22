import type { CuratedDriveNote } from './curated-drive-step'

/** Why notes for the `finalization-registry` walkthrough. Words: `drive.examples.finalizationRegistry.*`. */
export const finalizationRegistry: readonly CuratedDriveNote[] = [
  { key: 'queued', at: { k: 'console', text: 'after gc' } },
  { key: 'ownTask', at: { k: 'console', text: 'cleanup held value' } },
]
