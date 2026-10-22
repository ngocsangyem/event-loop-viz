import type { CuratedDriveNote } from './curated-drive-step'

/** Why notes for the `request-animation-frame` walkthrough. Words: `drive.examples.requestAnimationFrame.*`. */
export const requestAnimationFrame: readonly CuratedDriveNote[] = [
  { key: 'frame', at: { k: 'render:frame' } },
  { key: 'microBetween', at: { k: 'console', text: 'raf1-micro' } },
]
