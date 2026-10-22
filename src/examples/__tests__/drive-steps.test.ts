// @vitest-environment node
import { describe, expect, it } from 'vitest'
import en from '../../i18n/messages/en/drive-examples'
import vi from '../../i18n/messages/vi/drive-examples'
import { exampleMessageKey } from '../../renderer/drive/curated-drive-steps'
import { resolveDriveSteps } from '../../renderer/drive/resolve-drive-steps'
import { runScript } from '../../runner/run-script'
import { CURATED_DRIVE_STEPS } from '../drive-steps'
import { EXAMPLES } from '../example-library'

type Words = Record<string, Record<string, { title: string; body: string }>>

describe('curated Drive me steps', () => {
  it('cover every example', () => {
    expect(Object.keys(CURATED_DRIVE_STEPS).sort()).toEqual(EXAMPLES.map((e) => e.id).sort())
  })

  it('all find their event in the Run, in the written order, and have words in en and vi', async () => {
    for (const example of EXAMPLES) {
      const curated = CURATED_DRIVE_STEPS[example.id] ?? []
      const result = await runScript(example.script)
      expect(result.kind, example.id).toBe('ran')
      if (result.kind !== 'ran') continue

      const { steps, unresolved } = resolveDriveSteps(
        curated.map(({ key, ...step }) => ({ ...step, title: key, body: '' })),
        result.trace.events,
      )
      expect(unresolved.map((s) => s.title), example.id).toEqual([])
      const positions = steps.map((s) => s.position)
      expect(positions, example.id).toEqual([...new Set(positions)].sort((a, b) => a - b))

      const key = exampleMessageKey(example.id)
      for (const words of [en as Words, vi as Words]) {
        for (const { key: step } of curated) {
          expect(words[key]?.[step]?.title, `${example.id}.${step}`).toBeTruthy()
          expect(words[key]?.[step]?.body, `${example.id}.${step}`).toBeTruthy()
        }
        // No orphans: every written step is used by the walkthrough.
        expect(Object.keys(words[key] ?? {}).sort(), example.id).toEqual(curated.map((s) => s.key).sort())
      }
    }
  })

  it('point Source steps at a real line of the Script', () => {
    for (const example of EXAMPLES) {
      const lines = example.script.split('\n').length
      for (const step of CURATED_DRIVE_STEPS[example.id] ?? []) {
        if (step.line !== undefined) expect(step.line, `${example.id}.${step.key}`).toBeLessThanOrEqual(lines)
      }
    }
  })
})
