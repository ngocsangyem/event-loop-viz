import type { Locale } from '@/i18n/locales'
import { createPlayer } from '@/player/player'
import type { Trace } from '../../trace/trace-event'
import { readStoredModel } from '../ai/api-key-store'
import type { ApiKeyStore } from '../ai/api-key-store'
import { buildRunContext } from '../ai/build-run-context'
import { streamChat } from '../ai/openrouter-client'
import { AskAiError } from '../ai/openrouter-error'
import { loadModels, pickDefaultModel } from '../ai/openrouter-models'
import type { ModelInfo } from '../ai/openrouter-models'
import { buildDriveSystemPrompt } from './drive-ai-prompt'
import type { ResolvedDriveStep } from './drive-step'
import { parseDriveAiSteps } from './parse-drive-ai-steps'

/** There is no OpenRouter key yet: nothing was sent, the learner has to connect first. */
export class DriveNeedsKeyError extends Error {
  constructor() {
    super('an OpenRouter key is needed to write a walkthrough')
    this.name = 'DriveNeedsKeyError'
  }
}

export interface DriveAiStepsOptions {
  store: ApiKeyStore
  locale: () => Locale
  /** Swappable in tests. */
  chat?: typeof streamChat
  models?: () => Promise<ModelInfo[]>
}

/**
 * Drive me's AI steps for a Script without curated ones. The Script and its Trace go to
 * OpenRouter only from here, so only after the learner pressed DRIVE ME, and never without a
 * key. Answers are kept per Run inputs, model and language for the page load, so Prev / Next and
 * driving the same Run again cost nothing.
 */
export function createDriveAiSteps(options: DriveAiStepsOptions) {
  const { store, locale, chat = streamChat, models = loadModels } = options
  const cache = new Map<string, readonly ResolvedDriveStep[]>()

  async function modelId(): Promise<string> {
    return readStoredModel() || pickDefaultModel(await models()) || ''
  }

  return async function loadAiSteps(trace: Trace, signal: AbortSignal): Promise<readonly ResolvedDriveStep[]> {
    const apiKey = store.key.value
    if (!apiKey) throw new DriveNeedsKeyError()
    const model = await modelId()
    if (!model) throw new AskAiError('model-not-found')
    const language = locale()
    const { source, budgets, nodeCostUs, randomSeed } = trace.header
    const key = JSON.stringify([model, language, source, budgets, nodeCostUs, randomSeed])
    const hit = cache.get(key)
    if (hit) return hit

    const player = createPlayer(trace)
    const last = player.last()
    const end = player.stateAt(last)
    const context = buildRunContext({ script: source, events: trace.events, position: last, state: end, finalState: end })
    const reply = await chat({
      apiKey,
      model,
      signal,
      onDelta: () => undefined,
      messages: [
        { role: 'system', content: buildDriveSystemPrompt(language) },
        { role: 'user', content: `${context}\n\nWrite the walkthrough of this whole Run.` },
      ],
    })
    const steps = parseDriveAiSteps(reply, trace.events, source)
    cache.set(key, steps)
    return steps
  }
}
