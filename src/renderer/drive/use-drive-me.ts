import { shallowRef } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { EXAMPLES } from '@/examples/example-library'
import { curatedDriveSteps, narratedDriveSteps } from './curated-drive-steps'
import { useDriveSession } from './use-drive-session'
import type { DriveSessionOptions } from './use-drive-session'

interface DriveMeOptions extends Omit<DriveSessionOptions, 'loadSteps'> {
  script: Ref<string>
}

/**
 * Drive me for the app: the walkthrough session plus where its steps come from. Every Script
 * gets the steps built from its own Trace, so it works without any key; an example (even edited)
 * also gets its hand-written why notes while each of them still lands on a step.
 */
export function useDriveMe(options: DriveMeOptions) {
  const { t } = useI18n()
  /** The example the Script came from: the one loaded last, or the one it equals on startup. */
  const exampleId = shallowRef<string | null>(EXAMPLES.find((e) => e.script === options.script.value)?.id ?? null)

  const session = useDriveSession({
    ...options,
    loadSteps: async (trace) => curatedDriveSteps(exampleId.value, trace, t) ?? narratedDriveSteps(trace, t),
  })
  return { session, exampleId }
}
