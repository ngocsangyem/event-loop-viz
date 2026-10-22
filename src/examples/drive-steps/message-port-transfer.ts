import type { CuratedDriveNote } from './curated-drive-step'

/** Why notes for the `message-port-transfer` walkthrough. Words: `drive.examples.messagePortTransfer.*`. */
export const messagePortTransfer: readonly CuratedDriveNote[] = [
  { key: 'newObject', at: { k: 'console', text: 'received hello 1 false true' } },
  { key: 'queued', at: { k: 'console', text: 'via transferred port ping' } },
]
