export interface ModelInfo {
  id: string
  name: string
  contextLength: number
  free: boolean
}

const MODELS_URL = 'https://openrouter.ai/api/v1/models'

/**
 * Cheap, capable models, best first. The first one the live list contains is the default, so
 * the choice survives OpenRouter retiring a model.
 */
export const PREFERRED_MODELS = [
  'google/gemini-3.5-flash-lite',
  'deepseek/deepseek-v4-flash',
  'google/gemini-3.1-flash-lite',
  'openai/gpt-5.4-mini',
  'anthropic/claude-haiku-4.5',
] as const

export function pickDefaultModel(models: readonly ModelInfo[]): string | undefined {
  for (const id of PREFERRED_MODELS) if (models.some((m) => m.id === id)) return id
  return models[0]?.id
}

/** Reads the public models list; entries that are not text-output chat models are dropped. */
export function parseModels(json: unknown): ModelInfo[] {
  const data = (json as { data?: unknown } | null)?.data
  if (!Array.isArray(data)) return []
  const models: ModelInfo[] = []
  for (const raw of data as unknown[]) {
    if (typeof raw !== 'object' || raw === null) continue
    const m = raw as Record<string, unknown>
    if (typeof m.id !== 'string' || m.id === '') continue
    const outputs = (m.architecture as { output_modalities?: unknown } | undefined)?.output_modalities
    if (Array.isArray(outputs) && !outputs.includes('text')) continue
    const pricing = m.pricing as { prompt?: unknown } | undefined
    models.push({
      id: m.id,
      name: typeof m.name === 'string' && m.name !== '' ? m.name : m.id,
      contextLength: typeof m.context_length === 'number' ? m.context_length : 0,
      free: pricing?.prompt === '0',
    })
  }
  return models
}

let cached: Promise<ModelInfo[]> | undefined

/** The models list, fetched once per page load; a failure is not cached, so a retry refetches. */
export function loadModels(fetchImpl: typeof fetch = fetch): Promise<ModelInfo[]> {
  if (cached) return cached
  const request = (async () => {
    const response = await fetchImpl(MODELS_URL)
    if (!response.ok) throw new Error(`models ${response.status}`)
    const models = parseModels(await response.json())
    if (models.length === 0) throw new Error('no models')
    return models
  })()
  cached = request
  request.catch(() => {
    if (cached === request) cached = undefined
  })
  return request
}

/** Tests only: forget the cached list. */
export function resetModelsCache() {
  cached = undefined
}
