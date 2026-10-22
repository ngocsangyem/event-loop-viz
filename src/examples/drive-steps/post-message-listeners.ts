import type { CuratedDriveNote } from './curated-drive-step'

/** Why notes for the `post-message-listeners` walkthrough. Words: `drive.examples.postMessageListeners.*`. */
export const postMessageListeners: readonly CuratedDriveNote[] = [
  { key: 'oneTask', at: { k: 'task:queue', where: { source: 'posted-message' } } },
  { key: 'betweenListeners', at: { k: 'console', text: 'L1 micro' } },
]
