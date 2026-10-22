import type { CuratedDriveStep } from './curated-drive-step'
import { awaitVsThen } from './await-vs-then'
import { syncPromiseAsyncTimeout } from './sync-promise-async-timeout'
import { timersAndClamp } from './timers-and-clamp'
import { thenables } from './thenables'
import { asyncGenerators } from './async-generators'
import { messageChannelVsTimeout } from './message-channel-vs-timeout'
import { unhandledRejection } from './unhandled-rejection'
import { busyWait } from './busy-wait'
import { infiniteLoop } from './infinite-loop'

/** Curated walkthroughs, by example id. An example without an entry has no curated walkthrough. */
export const CURATED_DRIVE_STEPS: Readonly<Record<string, readonly CuratedDriveStep[]>> = {
  'await-vs-then': awaitVsThen,
  'sync-promise-async-timeout': syncPromiseAsyncTimeout,
  'timers-and-clamp': timersAndClamp,
  thenables,
  'async-generators': asyncGenerators,
  'message-channel-vs-timeout': messageChannelVsTimeout,
  'unhandled-rejection': unhandledRejection,
  'busy-wait': busyWait,
  'infinite-loop': infiniteLoop,
}

export type { CuratedDriveStep }
