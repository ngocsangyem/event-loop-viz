import { afterEach, describe, expect, it } from 'vitest'
import { chipElements } from '../chip-elements'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('chipElements', () => {
  it('finds chips by id', () => {
    document.body.innerHTML = '<ul><li><span data-chip-id="task-1"></span></li></ul>'
    expect([...chipElements().keys()]).toEqual(['task-1'])
  })

  it('skips chips inside a row leaving under any list transition', () => {
    document.body.innerHTML = `
      <ul>
        <li class="queue-item-leave-active"><span data-chip-id="a"></span></li>
        <li class="queue-snap-leave-active"><span data-chip-id="b"></span></li>
        <li><span data-chip-id="b" id="live"></span></li>
      </ul>`
    const found = chipElements()
    expect([...found.keys()]).toEqual(['b'])
    expect(found.get('b')?.id).toBe('live')
  })
})
