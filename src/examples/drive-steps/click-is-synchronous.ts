import type { CuratedDriveNote } from './curated-drive-step'

/** Why notes for the `click-is-synchronous` walkthrough. Words: `drive.examples.clickIsSynchronous.*`. */
export const clickIsSynchronous: readonly CuratedDriveNote[] = [
  { key: 'sameStack', at: { k: 'console', text: 'C2' } },
  { key: 'afterScript', at: { k: 'console', text: 'C1 micro' } },
]
