// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '../../i18n'
import { curatedDriveSteps } from '../../renderer/drive/curated-drive-steps'
import { runScript } from '../../runner/run-script'
import { CURATED_DRIVE_NOTES } from '../drive-steps'
import { EXAMPLES } from '../example-library'

const t = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params ?? {})

afterEach(() => {
  i18n.global.locale.value = 'en'
})

describe('example walkthroughs', () => {
  it('exist for every example', () => {
    expect(Object.keys(CURATED_DRIVE_NOTES).sort()).toEqual(EXAMPLES.map((e) => e.id).sort())
  })

  for (const locale of ['en', 'vi'] as const) {
    it(`land every note on a step and leave no message unfilled (${locale})`, async () => {
      i18n.global.locale.value = locale
      for (const example of EXAMPLES) {
        const result = await runScript(example.script)
        if (result.kind !== 'ran') throw new Error(`${example.id} did not run`)
        const steps = curatedDriveSteps(example.id, result.trace, t)
        expect(steps, example.id).not.toBeNull()
        const notes = steps!.filter((s) => s.note).length
        expect(notes, example.id).toBe(CURATED_DRIVE_NOTES[example.id]!.length)
        const positions = steps!.map((s) => s.position)
        expect(positions, example.id).toEqual([...new Set(positions)].sort((a, b) => a - b))
        for (const step of steps!) {
          for (const text of [step.title, step.body, step.note ?? '', step.info?.title ?? '', step.info?.body ?? '']) {
            expect(text, `${example.id}@${step.position}`).not.toMatch(/\{|\}|drive\.|halt\./)
          }
          if (step.line !== undefined) expect(step.line).toBeLessThanOrEqual(example.script.split('\n').length)
        }
      }
    })
  }
})
