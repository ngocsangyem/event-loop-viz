// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createApiKeyStore } from '../../ai/api-key-store'
import { runScript } from '../../../runner/run-script'
import { createDriveAiSteps, DriveNeedsKeyError } from '../drive-ai-steps'

async function traceOf(script: string) {
  const result = await runScript(script)
  if (result.kind !== 'ran') throw new Error('the Script did not run')
  return result.trace
}

function setup(key: string) {
  const store = createApiKeyStore(null)
  if (key) store.setKey(key)
  const chat = vi.fn(async (_options: unknown) => JSON.stringify({ steps: [{ seq: 1, target: 'event-loop', title: 'The Script starts', body: 'It is one Task.' }] }))
  const models = vi.fn(async () => [{ id: 'test/model', name: 'Test', contextLength: 1000, free: true }])
  const load = createDriveAiSteps({ store, locale: () => 'en', chat, models })
  return { load, chat }
}

describe('createDriveAiSteps', () => {
  it('sends nothing without a key', async () => {
    const { load, chat } = setup('')
    const trace = await traceOf('console.log(1)')
    await expect(load(trace, new AbortController().signal)).rejects.toBeInstanceOf(DriveNeedsKeyError)
    expect(chat).not.toHaveBeenCalled()
  })

  it('asks once per Run and model, passing the abort signal through', async () => {
    const { load, chat } = setup('sk-or-test')
    const trace = await traceOf('console.log(1)')
    const signal = new AbortController().signal
    const first = await load(trace, signal)
    const again = await load(trace, signal)
    expect(first).toBe(again)
    expect(chat).toHaveBeenCalledTimes(1)
    expect(chat.mock.calls[0]![0]).toMatchObject({ apiKey: 'sk-or-test', model: 'test/model', signal })
  })
})
