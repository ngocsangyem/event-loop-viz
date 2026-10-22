import { shallowRef } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { EXAMPLES } from '@/examples/example-library'
import type { Locale } from '@/i18n/locales'
import { sharedApiKeyStore } from '../ai/shared-api-key-store'
import { createDriveAiSteps } from './drive-ai-steps'
import { curatedDriveSteps } from './curated-drive-steps'
import { useDriveSession } from './use-drive-session'
import type { DriveSessionOptions } from './use-drive-session'

interface DriveMeOptions extends Omit<DriveSessionOptions, 'loadSteps'> {
  script: Ref<string>
}

/**
 * Drive me for the app: the walkthrough session plus where its steps come from. An example keeps
 * its curated steps (even edited) while every step still finds its event in the Trace; any other
 * Script (or an example edited past that) gets steps the AI writes from its Run.
 */
export function useDriveMe(options: DriveMeOptions) {
  const { t, locale } = useI18n()
  const aiSteps = createDriveAiSteps({ store: sharedApiKeyStore(), locale: () => locale.value as Locale })
  /** The example the Script came from: the one loaded last, or the one it equals on startup. */
  const exampleId = shallowRef<string | null>(EXAMPLES.find((e) => e.script === options.script.value)?.id ?? null)

  const session = useDriveSession({
    ...options,
    loadSteps: async (trace, signal) => curatedDriveSteps(exampleId.value, trace.events, t) ?? aiSteps(trace, signal),
  })
  return { session, exampleId }
}
