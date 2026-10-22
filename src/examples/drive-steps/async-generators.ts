import type { CuratedDriveNote } from './curated-drive-step'

/** Why notes for the `async-generators` walkthrough. Words: `drive.examples.asyncGenerators.*`. */
export const asyncGenerators: readonly CuratedDriveNote[] = [
  { key: 'onlyCreates', at: { k: 'frame:push', where: { label: 'g' } } },
  { key: 'yieldAwaits', at: { k: 'await:suspend' } },
  { key: 'neverAfter', at: { k: 'asyncgen:yield' } },
]
