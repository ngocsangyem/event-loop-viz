import type { InjectionKey, Ref } from 'vue'
import type { StepFocus } from './step-focus-model'

/** The app provides what the current step changed; panes and queue rows read it to mark themselves. */
export const STEP_FOCUS_KEY: InjectionKey<Readonly<Ref<StepFocus>>> = Symbol('step-focus')
