import { describe, expect, it } from 'vitest'
import { haltMessage, updateSetting } from '../run-settings-model'

describe('updateSetting', () => {
  it('stores a Budget override', () => {
    expect(updateSetting({}, 'nodes', '5000')).toEqual({ budgets: { nodes: 5000 } })
  })

  it('keeps the other settings', () => {
    const before = { budgets: { tasks: 10 }, nodeCostUs: 3, randomSeed: 7 }
    expect(updateSetting(before, 'nodes', '5000')).toEqual({
      budgets: { tasks: 10, nodes: 5000 },
      nodeCostUs: 3,
      randomSeed: 7,
    })
  })

  it('does not mutate its input', () => {
    const before = { budgets: { tasks: 10 } }
    updateSetting(before, 'tasks', '20')
    expect(before).toEqual({ budgets: { tasks: 10 } })
  })

  it('stores the per-node cost at top level', () => {
    expect(updateSetting({}, 'nodeCostUs', '2.5')).toEqual({ nodeCostUs: 2.5 })
  })

  it.each(['', '  ', 'abc', '0', '-4'])('reverts to the default for %j', (raw) => {
    expect(updateSetting({ budgets: { nodes: 9 }, nodeCostUs: 2 }, 'nodes', raw)).toEqual({
      nodeCostUs: 2,
    })
  })

  it('requires whole numbers for Budgets', () => {
    expect(updateSetting({}, 'events', '10.5')).toEqual({})
  })
})

describe('haltMessage', () => {
  it('names the node Budget and its limit', () => {
    expect(haltMessage('nodes', 5000)).toBe('Halted: the node Budget (5,000 nodes) was exceeded.')
  })

  it('names each other Budget', () => {
    expect(haltMessage('tasks', 50)).toContain('Task Budget (50 Tasks)')
    expect(haltMessage('virtual-time', 1000)).toContain('virtual time Budget (1,000 ms)')
    expect(haltMessage('events', 200000)).toContain('event Budget (200,000 events)')
  })

  it('has no message for a natural end', () => {
    expect(haltMessage('natural')).toBeNull()
  })
})
