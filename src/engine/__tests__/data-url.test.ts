// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { forgivingBase64Decode, isJavaScriptMimeType, percentDecode, processDataUrl } from '../data-url'

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

describe('data: URL processor', () => {
  it('defaults the MIME type to text/plain;charset=US-ASCII (Chrome 155)', () => {
    const resource = processDataUrl('data:,a%20b')!
    expect(resource.mimeType).toBe('text/plain;charset=US-ASCII')
    expect(text(resource.body)).toBe('a b')
  })

  it('decodes base64 and keeps the declared type', () => {
    const resource = processDataUrl('data:text/plain;base64,aGVsbG8=')!
    expect(resource.mimeType).toBe('text/plain')
    expect(text(resource.body)).toBe('hello')
  })

  it('keeps JSON bodies and drops the fragment', () => {
    const resource = processDataUrl('data:application/json,{"a":1}#frag')!
    expect(resource.mimeType).toBe('application/json')
    expect(text(resource.body)).toBe('{"a":1}')
  })

  it('prefixes text/plain to parameters without a type', () => {
    expect(processDataUrl('data:;charset=utf-8,x')!.mimeType).toBe('text/plain;charset=utf-8')
  })

  it('fails without a comma or with bad base64', () => {
    expect(processDataUrl('data:text/plain')).toBeUndefined()
    expect(processDataUrl('data:;base64,a')).toBeUndefined()
  })

  it('percent-decodes only valid escapes', () => {
    expect(text(percentDecode('%41%zz%'))).toBe('A%zz%')
  })

  it('ignores whitespace in base64', () => {
    expect(text(forgivingBase64Decode(' aGVs bG8= ')!)).toBe('hello')
  })

  it('recognises JavaScript MIME types only', () => {
    expect(isJavaScriptMimeType('text/javascript')).toBe(true)
    expect(isJavaScriptMimeType('application/javascript;charset=utf-8')).toBe(true)
    expect(isJavaScriptMimeType('text/plain')).toBe(false)
  })
})
