import { describe, expect, it } from 'vitest'
import { splitConceptIds } from '../caption-sentence-parts'

describe('splitConceptIds', () => {
  it('tints Task, Job and Timer ids and keeps the text between them', () => {
    expect(splitConceptIds('Task #2 queues Job #3, then Timer #1 fires.')).toEqual([
      { text: 'Task #2', hue: 'task' },
      { text: ' queues ' },
      { text: 'Job #3', hue: 'job' },
      { text: ', then ' },
      { text: 'Timer #1', hue: 'webapi' },
      { text: ' fires.' },
    ])
  })

  it('returns one plain part when there is no id, and nothing for an empty sentence', () => {
    expect(splitConceptIds('Script runs.')).toEqual([{ text: 'Script runs.' }])
    expect(splitConceptIds('')).toEqual([])
  })

  it('does not tint a bare word without a number', () => {
    expect(splitConceptIds('The Task finishes')).toEqual([{ text: 'The Task finishes' }])
  })
})
