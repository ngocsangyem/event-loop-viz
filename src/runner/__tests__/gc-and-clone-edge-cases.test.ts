// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { runScript } from '../run-script'

async function logs(script: string) {
  const result = await runScript(script)
  if (result.kind !== 'ran') throw new Error(`expected a finished run, got ${result.kind}`)
  return result.observableOutput.map((o) => (o.kind === 'console' ? o.text : `[${o.kind}] ${o.message}`))
}

describe('gc() reachability', () => {
  it('keeps what a pending await will use alive', async () => {
    expect(
      await logs(`
        let wr
        ;(async () => {
          const obj = {}
          wr = new WeakRef(obj)
          await new Promise((r) => setTimeout(r, 10))
          console.log('after await', wr.deref() === obj)
        })()
        setTimeout(() => { gc(); console.log('at gc', wr.deref() !== undefined) }, 5)
      `),
    ).toEqual(['at gc true', 'after await true'])
  })

  it('keeps what a then callback on a pending promise captures alive', async () => {
    expect(
      await logs(`
        let wr
        const pending = new Promise(() => {})
        ;(function () { const big = {}; wr = new WeakRef(big); pending.then(() => big) })()
        setTimeout(() => { gc(); console.log(wr.deref() !== undefined) }, 0)
      `),
    ).toEqual(['true'])
  })

  it('lets a rejected promise go once it was handled', async () => {
    expect(
      await logs(`
        let p = Promise.reject(1); p.catch(() => {}); const wr = new WeakRef(p); p = null
        setTimeout(() => { gc(); console.log(wr.deref() === undefined) }, 0)
      `),
    ).toEqual(['true'])
  })

  it('keeps the objects of a loaded module alive through the module map', async () => {
    expect(
      await logs(`
        import('data:text/javascript,export const o = {}; globalThis.wr = new WeakRef(o)')
          .then(() => setTimeout(() => { gc(); console.log(wr.deref() !== undefined) }, 0))
      `),
    ).toEqual(['true'])
  })
})

describe('structured clone edge cases', () => {
  it('clones Boolean, String and BigInt wrapper objects', async () => {
    expect(
      await logs(`
        const c = new MessageChannel()
        c.port1.onmessage = (e) => console.log(e.data.map((x) => typeof x + ':' + x.valueOf()).join(' '))
        c.port2.postMessage([new Boolean(true), new String('a'), Object(1n), new Number(2)])
      `),
    ).toEqual(['object:true object:a object:1 object:2'])
  })

  it('detaches every transferred ArrayBuffer, even one the message does not reference', async () => {
    expect(await logs(`const b = new ArrayBuffer(8); postMessage(1, '*', [b]); console.log(b.byteLength)`)).toEqual(['0'])
  })

  it('refuses to clone a detached ArrayBuffer', async () => {
    expect(
      await logs(`
        const c = new MessageChannel(); const a = new ArrayBuffer(8)
        c.port1.postMessage(a, [a])
        try { c.port1.postMessage(a) } catch (e) { console.log(e.name, e.message) }
      `),
    ).toEqual(["DataCloneError Failed to execute 'postMessage' on 'MessagePort': An ArrayBuffer is detached and could not be cloned."])
  })

  it('keeps a resizable ArrayBuffer resizable', async () => {
    expect(
      await logs(`
        addEventListener('message', (e) => console.log(e.data.resizable, e.data.maxByteLength))
        postMessage(new ArrayBuffer(4, { maxByteLength: 8 }), '*')
      `),
    ).toEqual(['true 8'])
  })
})
