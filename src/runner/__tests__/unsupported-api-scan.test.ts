import { describe, expect, it } from 'vitest'
import { scanUnsupportedApis } from '../unsupported-api-scan'

describe('scanUnsupportedApis', () => {
  const table: [name: string, script: string, expected: string[]][] = [
    ['nothing referenced', `setTimeout(() => console.log('x'), 0); Promise.resolve()`, []],
    ['fetch call', `fetch('/x')`, ['fetch']],
    ['requestAnimationFrame', `requestAnimationFrame(() => {})`, ['requestAnimationFrame']],
    ['document and addEventListener', `document.addEventListener('x', f)`, ['document']],
    ['bare addEventListener', `addEventListener('load', f)`, ['addEventListener']],
    ['window reference', `window.foo = 1`, ['window']],
    ['bare postMessage', `postMessage('hi', '*')`, ['postMessage']],
    [
      'WeakRef and FinalizationRegistry',
      `new WeakRef({}); new FinalizationRegistry(() => {})`,
      ['WeakRef', 'FinalizationRegistry'],
    ],
    ['SharedArrayBuffer', `const b = new SharedArrayBuffer(8)`, ['SharedArrayBuffer']],
    ['Atomics.wait', `Atomics.wait(i32, 0, 0)`, ['Atomics.wait']],
    ['other Atomics members are fine', `Atomics.add(i32, 0, 1)`, []],
    [
      'each API listed once, in first-use order',
      `fetch('/a'); requestAnimationFrame(f); fetch('/b')`,
      ['fetch', 'requestAnimationFrame'],
    ],
    ['string literals are not references', `console.log('fetch', "document", \`window\`)`, []],
    ['comments are not references', `// fetch('/x')\n/* document */ 1`, []],
    ['property names are not references', `obj.fetch(); obj.document; ({ window: 1 }).window`, []],
    ['template interpolation is code', 'console.log(`${fetch}`)', ['fetch']],
    ['regex literal is not code', `const r = /fetch/g; r.test('x')`, []],
    ['identifiers merely containing a name', `const fetcher = 1; const documents = 2`, []],
  ]
  it.each(table)('%s', (_name, script, expected) => {
    expect(scanUnsupportedApis(script)).toEqual(expected)
  })
})
