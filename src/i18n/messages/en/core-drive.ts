import examples from './drive-examples'
import narration from './drive-narration'
import info from './drive-info'

/** Drive me: the highlighted, step-by-step walkthrough of a Run. */
export default {
  drive: {
    examples,
    narration,
    info,
    ai: {
      keyTitle: 'Connect OpenRouter to drive this Script',
      keyBody: 'This Script has no hand-written walkthrough. With an OpenRouter key, the AI writes one from this Run. The Script and its Trace are sent only when you press Drive me.',
      connect: 'Connect',
      formatBody: "The AI's reply had no usable steps. Try again, or pick another model in settings.",
      retry: 'Try again',
    },
    region: 'Drive me walkthrough',
    progress: 'Step {current} of {total}',
    prev: 'Prev',
    next: 'Next',
    done: 'Done',
    end: 'End',
    why: 'Why',
    infoButton: 'Under the hood',
    infoSource: 'Source',
    start: 'Drive me',
    stop: 'End Drive me',
    loading: 'Preparing the walkthrough…',
    emptyTitle: 'No walkthrough for this Script yet',
    emptyBody: 'Load an example to follow its guided walkthrough, or step through the replay with the playback controls.',
    errorTitle: 'The walkthrough could not start',
    errorBody: 'Something went wrong while preparing the steps. Try again, or step through the replay yourself.',
  },
}
