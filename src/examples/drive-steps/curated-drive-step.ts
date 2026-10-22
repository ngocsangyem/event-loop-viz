import type { EventMatcher } from '@/renderer/drive/drive-step'

/**
 * A hand-written "why" note on one step of an example's walkthrough. The steps themselves are
 * built from the Trace; a note stands on one of their events and explains the order. Its words
 * live in i18n under `drive.examples.<exampleCamelId>.<key>`.
 */
export interface CuratedDriveNote {
  at: EventMatcher
  key: string
}
