import type { CuratedDriveNote } from './curated-drive-step'

/** Why notes for the `fetch-mock-api` walkthrough. Words: `drive.examples.fetchMockApi.*`. */
export const fetchMockApi: readonly CuratedDriveNote[] = [
  { key: 'latency', at: { k: 'webapi:start', where: { api: 'fetch' } } },
  { key: 'microFirst', at: { k: 'console', text: 'microtask' } },
  { key: 'oneHop', at: { k: 'console', text: 'user Ada' } },
]
