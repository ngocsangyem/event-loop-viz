import { describe, expect, it } from 'vitest'
import { scanUnsupportedApis } from '../unsupported-api-scan'

describe('scanUnsupportedApis', () => {
  const table: [name: string, script: string, expected: string[]][] = [
    ['nothing referenced', `setTimeout(() => console.log('x'), 0); Promise.resolve()`, []],
    ['supported host APIs are not listed', `fetch('/x'); requestAnimationFrame(f); document.body; new WeakRef({})`, []],
    ['Worker', `new Worker('w.js')`, ['Worker']],
    ['XMLHttpRequest and WebSocket', `new XMLHttpRequest(); new WebSocket(u)`, ['XMLHttpRequest', 'WebSocket']],
    ['requestIdleCallback', `requestIdleCallback(f)`, ['requestIdleCallback']],
    [
      'each API listed once, in first-use order',
      `new Worker(a); requestIdleCallback(f); new Worker(b)`,
      ['Worker', 'requestIdleCallback'],
    ],
    ['string literals are not references', `console.log('Worker', "WebSocket", \`XMLHttpRequest\`)`, []],
    ['comments are not references', `// new Worker('x')\n/* WebSocket */ 1`, []],
    ['property names are not references', `obj.Worker(); obj.WebSocket; ({ Worker: 1 }).Worker`, []],
    ['template interpolation is code', 'console.log(`${Worker}`)', ['Worker']],
    ['regex literal is not code', `const r = /Worker/g; r.test('x')`, []],
    ['identifiers merely containing a name', `const Workers = 1; const WebSocketish = 2`, []],
  ]
  it.each(table)('%s', (_name, script, expected) => {
    expect(scanUnsupportedApis(script)).toEqual(expected)
  })
})
