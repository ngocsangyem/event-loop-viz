import { describe, expect, it } from 'vitest'
import { DEFAULT_MOCK_LATENCY_MS, parseFetchMocks } from '../fetch-mock-directives'

describe('// @fetch directives', () => {
  it('reads url, status, latency and a JSON body', () => {
    expect(parseFetchMocks('// @fetch https://api.test/users 201 30ms {"n":1}\nfetch(x)')).toEqual([
      { url: 'https://api.test/users', status: 201, latencyMs: 30, body: '{"n":1}', contentType: 'application/json' },
    ])
  })

  it('defaults to 200, the default latency and an empty text body', () => {
    expect(parseFetchMocks('  //   @fetch https://api.test/x')).toEqual([
      { url: 'https://api.test/x', status: 200, latencyMs: DEFAULT_MOCK_LATENCY_MS, body: '', contentType: 'text/plain' },
    ])
  })

  it('serves a body that is not JSON as text', () => {
    expect(parseFetchMocks('// @fetch https://api.test/x 404 nope, not here')[0]).toMatchObject({
      status: 404,
      body: 'nope, not here',
      contentType: 'text/plain',
    })
  })

  it('ignores other comments and code', () => {
    expect(parseFetchMocks('// fetch https://api.test/x\nconst a = "// @fetch nope"')).toEqual([])
  })
})
