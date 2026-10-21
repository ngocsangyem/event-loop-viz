import { describe, expect, it } from 'vitest'
import { beginCallback, onFramePop, onFramePush } from '../running-callback'

describe('running callback helpers', () => {
  const fn = { kind: 'function' as const }
  it('has nothing to follow without a descriptor', () => {
    expect(beginCallback('task', 'T1', undefined)).toBeNull()
  })
  it('skips the root frame and takes the next user frame, ignoring built-in closures', () => {
    let rc = beginCallback('job', 'J1', fn)
    rc = onFramePush(rc, { frameId: 'f1', builtin: false })
    expect(rc?.frameId).toBeNull()
    rc = onFramePush(rc, { frameId: 'f2', builtin: true })
    expect(rc?.frameId).toBeNull()
    rc = onFramePush(rc, { frameId: 'f3', builtin: false })
    expect(rc?.frameId).toBe('f3')
  })
  it('takes the next frame of any kind for a built-in callback', () => {
    let rc = beginCallback('task', 'T1', { kind: 'builtin', name: 'log' })
    rc = onFramePush(rc, { frameId: 'f1', builtin: false })
    rc = onFramePush(rc, { frameId: 'f2', builtin: true })
    expect(rc?.frameId).toBe('f2')
  })
  it('marks done once its frame is off the stack and never mutates the old value', () => {
    const before = onFramePush(onFramePush(beginCallback('task', 'T1', fn), { frameId: 'f1', builtin: false }), {
      frameId: 'f2',
      builtin: false,
    })
    const after = onFramePop(before, [{ frameId: 'f1', label: 'script', builtin: false }])
    expect(after?.done).toBe(true)
    expect(before?.done).toBe(false)
  })
})
