import type { DriveSpot, EventMatcher } from '@/renderer/drive/drive-step'

/**
 * A hand-written Drive me step of an example. Its words live in i18n under
 * `drive.examples.<exampleCamelId>.<key>.{title,body}`, so translators never touch matchers.
 */
export interface CuratedDriveStep extends DriveSpot {
  at: EventMatcher
  key: string
}
