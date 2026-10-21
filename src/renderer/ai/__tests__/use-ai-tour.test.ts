import { describe, expect, it } from 'vitest'
import { nextTick, shallowRef } from 'vue'
import { useAiTour } from '../use-ai-tour'
import type { StopResolver } from '../use-ai-tour'
import type { ConversationMessage } from '../use-ask-ai'

function setup(answer: string) {
  const messages = shallowRef<ConversationMessage[]>([
    { id: 1, role: 'user', content: 'q' },
    { id: 2, role: 'assistant', content: answer },
  ])
  const position = shallowRef(0)
  const resolver = shallowRef<StopResolver | null>((seq) => seq)
  const seeks: number[] = []
  const announced: string[] = []
  const tour = useAiTour({
    messages,
    streaming: shallowRef(false),
    resolver,
    position,
    onStop: (stop, i, total) => announced.push(`${i + 1}/${total} ${stop.title}`),
    seek: (seq) => {
      seeks.push(seq)
      position.value = seq
    },
  })
  return { messages, position, resolver, seeks, announced, tour }
}

const ANSWER = 'Intro\n## #3 A\na\n## #8 B\nb\n## #12 C\nc'

describe('useAiTour', () => {
  it('waits at the start, then Next and Previous move the replay stop by stop', () => {
    const { tour, seeks, announced } = setup(ANSWER)
    expect(tour.stops.value.map((s) => s.seq)).toEqual([3, 8, 12])
    expect(tour.index.value).toBe(-1)
    tour.next()
    tour.next()
    tour.next()
    tour.next()
    tour.prev()
    expect(seeks).toEqual([3, 8, 12, 12, 8])
    expect(tour.index.value).toBe(1)
    expect(announced[announced.length - 1]).toBe('2/3 B')
  })

  it('once started, follows the playhead onto a stop reached by other means', async () => {
    const { tour, position, announced } = setup(ANSWER)
    position.value = 8
    await nextTick()
    expect(tour.index.value).toBe(-1)
    tour.next()
    const before = announced.length
    position.value = 12
    await nextTick()
    expect(tour.index.value).toBe(2)
    // Following the playhead is not announced: the step announcer already speaks for the replay.
    expect(announced).toHaveLength(before)
  })

  it('after a new Run, older answers lose their stops and the tour starts over', async () => {
    const { tour, resolver } = setup(ANSWER)
    tour.next()
    resolver.value = (seq) => seq
    await nextTick()
    expect(tour.stops.value).toEqual([])
    expect(tour.index.value).toBe(-1)
  })

  it('a new answer with stops starts a new tour at its beginning', async () => {
    const { tour, messages } = setup(ANSWER)
    tour.next()
    messages.value = [...messages.value, { id: 3, role: 'user', content: 'again' }, { id: 4, role: 'assistant', content: '## #20 D\nd' }]
    await nextTick()
    expect(tour.messageId.value).toBe(4)
    expect(tour.index.value).toBe(-1)
    tour.go(2, 2)
    expect(tour.messageId.value).toBe(2)
    expect(tour.index.value).toBe(2)
  })
})
