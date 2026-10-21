// @vitest-environment node
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { TRACE_SCHEMA_VERSION } from '../trace-event'
import { describeTraceSchema, validateTraceEvent } from '../trace-event-schema'

const snapshotPath = fileURLToPath(
  new URL('../../../tests/golden/trace-schema-v2.json', import.meta.url),
)

describe('Trace schema v2 snapshot', () => {
  // A shape change must bump TRACE_SCHEMA_VERSION and regenerate the snapshot deliberately:
  //   UPDATE_GOLDEN=1 pnpm exec vitest run src/trace/__tests__/trace-schema.test.ts
  it.runIf(process.env.UPDATE_GOLDEN)('regenerates the snapshot', () => {
    writeFileSync(snapshotPath, JSON.stringify(describeTraceSchema(), null, 2) + '\n')
    expect(JSON.parse(readFileSync(snapshotPath, 'utf8')).schemaVersion).toBe(TRACE_SCHEMA_VERSION)
  })

  it.skipIf(process.env.UPDATE_GOLDEN)('pins every event kind, field and header field', () => {
    const pinned = JSON.parse(readFileSync(snapshotPath, 'utf8'))
    expect(describeTraceSchema()).toEqual(pinned)
  })

  it('is pinned for schemaVersion 2', () => {
    expect(TRACE_SCHEMA_VERSION).toBe(2)
    expect(JSON.parse(readFileSync(snapshotPath, 'utf8')).schemaVersion).toBe(2)
  })
})

describe('validateTraceEvent', () => {
  const base = { seq: 0, t: 0, ref: 'HTML:run-a-classic-script', visible: true }

  it('accepts a well-formed event', () => {
    expect(validateTraceEvent({ ...base, k: 'console', level: 'log', text: 'x' })).toEqual([])
  })

  it('rejects an unknown kind, an unknown field, a missing field and a bad enum value', () => {
    expect(validateTraceEvent({ ...base, k: 'render:step' })).not.toEqual([])
    expect(
      validateTraceEvent({ ...base, k: 'console', level: 'log', text: 'x', extra: 1 }),
    ).not.toEqual([])
    expect(validateTraceEvent({ ...base, k: 'console', level: 'log' })).not.toEqual([])
    expect(validateTraceEvent({ ...base, k: 'console', level: 'debug', text: 'x' })).not.toEqual([])
  })
})
