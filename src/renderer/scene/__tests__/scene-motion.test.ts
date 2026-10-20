import { describe, expect, it } from 'vitest'
import { JOB_TRAY } from '../job-queue-geometry'
import { arrivals, dropIn } from '../scene-motion'
import { trayGlides } from '../queue-tray-motion'

describe('arrivals', () => {
  it('lists ids that were not there one step earlier', () => {
    expect([...arrivals(['a', 'b'], ['a', 'b', 'c'])]).toEqual(['c'])
  })

  it('has no arrivals when there is no earlier state to compare with', () => {
    expect(arrivals(null, ['a']).size).toBe(0)
  })
})

describe('trayGlides', () => {
  const entries = (queued: string[], running: string | null = null) => ({ queued, running })

  it('lowers a token that is new to the tray into the trough', () => {
    const glides = trayGlides(JOB_TRAY, entries([]), entries(['j1']))
    expect(glides.get('j1')).toEqual(dropIn())
  })

  it('slides the token that begins from its old slot onto the run pad', () => {
    const glides = trayGlides(JOB_TRAY, entries(['j1', 'j2']), entries(['j2'], 'j1'))
    const glide = glides.get('j1')!
    expect(Math.hypot(glide.dx, glide.dy)).toBeGreaterThan(0)
    expect(glide.fade).toBe(false)
    expect(glides.has('j2')).toBe(false)
  })

  it('moves the token further when it waited deeper in the trough', () => {
    const head = trayGlides(JOB_TRAY, entries(['j1', 'j2']), entries(['j2'], 'j1')).get('j1')!
    const deep = trayGlides(JOB_TRAY, entries(['j0', 'j1']), entries(['j0'], 'j1')).get('j1')!
    expect(Math.hypot(deep.dx, deep.dy)).toBeGreaterThan(Math.hypot(head.dx, head.dy))
  })

  it('leaves tokens that were already there alone', () => {
    expect(trayGlides(JOB_TRAY, entries(['j1'], 'j0'), entries(['j1'], 'j0')).size).toBe(0)
  })

  it('does not animate when there is no earlier state', () => {
    expect(trayGlides(JOB_TRAY, null, entries(['j1'], 'j0')).size).toBe(0)
  })

  it('does not animate a running token that was nowhere in the tray before', () => {
    expect(trayGlides(JOB_TRAY, entries([]), entries([], 'j9')).size).toBe(0)
  })
})
