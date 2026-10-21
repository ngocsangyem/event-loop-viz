import { onMounted, shallowRef, watch } from 'vue'
import { readStoredModel, writeStoredModel } from './api-key-store'
import { loadModels, pickDefaultModel } from './openrouter-models'
import type { ModelInfo } from './openrouter-models'

/**
 * The chosen model and OpenRouter's model list. The choice is remembered on this device (it is
 * not a secret); with nothing remembered, the first load picks a sensible default.
 */
export function useOpenRouterModelChoice() {
  const model = shallowRef(readStoredModel())
  const models = shallowRef<readonly ModelInfo[]>([])
  const status = shallowRef<'loading' | 'ready' | 'error'>('loading')

  async function fetchModels() {
    status.value = 'loading'
    try {
      models.value = await loadModels()
      status.value = 'ready'
      if (!model.value) model.value = pickDefaultModel(models.value) ?? ''
    } catch {
      status.value = 'error'
    }
  }
  onMounted(() => void fetchModels())
  watch(model, (id) => id && writeStoredModel(id))

  return { model, models, status, fetchModels }
}
