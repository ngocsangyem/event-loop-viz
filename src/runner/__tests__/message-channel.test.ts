// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { runScript } from '../run-script'
import type { RunResult } from '../run-script'

type Ran = Extract<RunResult, { kind: 'ran' }>

async function ran(script: string): Promise<Ran> {
  const result = await runScript(script)
  if (result.kind !== 'ran') throw new Error(`expected a finished run, got ${result.kind}`)
  return result
}

const logs = (r: Ran) => r.observableOutput.map((o) => (o.kind === 'console' ? o.text : o.kind))

describe('MessageChannel', () => {
  it('queues each posted message as a Task on the port-message source', async () => {
    const r = await ran(`
      const ch = new MessageChannel()
      ch.port1.onmessage = () => {}
      ch.port2.postMessage(1)
      ch.port2.postMessage(2)
    `)
    const sources = r.trace.events.flatMap((e) => (e.k === 'task:queue' ? [e.source] : []))
    expect(sources).toEqual(['script', 'port-message', 'port-message'])
  })

  it('delivers a message event with its data, in post order, to the receiving port', async () => {
    const r = await ran(`
      const ch = new MessageChannel()
      ch.port1.onmessage = (e) => console.log(e.type, e.data, e.target === ch.port1)
      ch.port2.postMessage('a')
      ch.port2.postMessage(2)
    `)
    expect(logs(r)).toEqual(['message a true', 'message 2 true'])
  })

  it('does not deliver synchronously: the Script finishes first', async () => {
    const r = await ran(`
      const ch = new MessageChannel()
      ch.port1.onmessage = () => console.log('message')
      ch.port2.postMessage(null)
      console.log('sync')
    `)
    expect(logs(r)).toEqual(['sync', 'message'])
  })

  it('runs a Checkpoint after each message Task', async () => {
    const r = await ran(`
      const ch = new MessageChannel()
      ch.port1.onmessage = (e) => {
        console.log('handler', e.data)
        Promise.resolve().then(() => console.log('job'))
      }
      ch.port2.postMessage(1)
      ch.port2.postMessage(2)
    `)
    expect(logs(r)).toEqual(['handler 1', 'job', 'handler 2', 'job'])
  })

  it('holds messages until the port is started, then delivers them in order', async () => {
    const r = await ran(`
      const ch = new MessageChannel()
      ch.port2.postMessage('early')
      setTimeout(() => {
        console.log('before start')
        ch.port1.onmessage = (e) => console.log('got', e.data)
      }, 5)
    `)
    expect(logs(r)).toEqual(['before start', 'got early'])
  })

  it('a handler assigned after start() still receives messages, because delivery happens in a later Task', async () => {
    const r = await ran(`
      const ch = new MessageChannel()
      ch.port2.postMessage('x')
      ch.port1.start()
      ch.port1.onmessage = (e) => console.log('got', e.data)
    `)
    expect(logs(r)).toEqual(['got x'])
  })

  it('drops messages for a closed port', async () => {
    const r = await ran(`
      const ch = new MessageChannel()
      ch.port1.onmessage = () => console.log('should not run')
      ch.port2.postMessage(1)
      ch.port1.close()
      ch.port2.postMessage(2)
    `)
    expect(logs(r)).toEqual([])
  })

  it('ping-pong between the two ports interleaves with timers by enqueue time', async () => {
    const r = await ran(`
      const ch = new MessageChannel()
      let n = 0
      ch.port1.onmessage = () => { console.log('p1', n); if (n++ < 2) ch.port2.postMessage(null) }
      ch.port2.onmessage = () => console.log('p2')
      ch.port2.postMessage(null)
      setTimeout(() => console.log('timer'), 0)
    `)
    expect(logs(r)).toEqual(['p1 0', 'timer', 'p1 1', 'p1 2'])
  })

  it('reports an exception thrown by a handler and keeps running', async () => {
    const r = await ran(`
      const ch = new MessageChannel()
      ch.port1.onmessage = () => { throw new Error('boom') }
      ch.port2.postMessage(null)
      setTimeout(() => console.log('timer'), 0)
    `)
    expect(logs(r)).toEqual(['uncaught-exception', 'timer'])
  })

  it('requires new', async () => {
    const r = await ran(`
      try { MessageChannel() } catch (e) { console.log(e instanceof TypeError) }
    `)
    expect(logs(r)).toEqual(['true'])
  })
})
