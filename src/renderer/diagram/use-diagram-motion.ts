import { onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import { EDGE_ENDS } from './diagram-flow'
import type { Flow, NodeId } from './diagram-flow'
import type { DiagramLayout } from './diagram-layout'
import { DRAW_MS, FADE_MS, scheduleHops, signalKeyframes } from './diagram-signal'

const TRAVEL_EASE = 'cubic-bezier(0.45, 0, 0.2, 1)'
const SETTLE_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

/**
 * Plays one step on the diagram: the signal dot runs along each of the step's edges in turn,
 * and when it arrives the target card's border is drawn in and the arrowhead lights. The final
 * look (lit border, highlighted edge) is plain CSS keyed off the data attributes, so all this
 * does is the journey to it. Every animation is a Web Animation that `cancel` removes, which
 * puts the elements straight back at that final look: stepping fast leaves no stacked dots.
 */
export function useDiagramMotion(svg: Ref<SVGSVGElement | null>) {
  let running: Animation[] = []

  function cancel() {
    for (const animation of running) animation.cancel()
    running = []
  }

  function play(flow: Flow, layout: DiagramLayout) {
    cancel()
    const root = svg.value
    if (!root || typeof root.animate !== 'function') return
    const part = (scope: string, name: string) => root.querySelector<SVGElement>(`${scope} [data-part="${name}"]`)
    const run = (el: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      if (el) running.push(el.animate(keyframes, options))
    }

    const hops = scheduleHops(flow.edges.map((edge) => layout.edges[edge].points))
    const arrival: Partial<Record<NodeId, number>> = {}
    const signal = root.querySelector('[data-part="signal"]')

    flow.edges.forEach((edge, i) => {
      const hop = hops[i]!
      const scope = `[data-edge="${edge}"]`
      arrival[EDGE_ENDS[edge].to] = hop.arrival
      run(
        signal,
        signalKeyframes(layout.edges[edge].points).map(({ offset, transform }) => ({ offset, transform })),
        { delay: hop.start, duration: hop.duration, easing: TRAVEL_EASE },
      )
      run(
        signal,
        [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.88 }, { opacity: 0 }],
        { delay: hop.start, duration: hop.duration, easing: 'linear' },
      )
      const fadeIn = [{ opacity: 0 }, { opacity: 1 }]
      run(part(scope, 'line-hot'), fadeIn, { delay: hop.start, duration: FADE_MS, fill: 'backwards' })
      run(part(scope, 'pill'), fadeIn, { delay: hop.start, duration: FADE_MS, fill: 'backwards' })
      run(part(scope, 'head-hot'), fadeIn, { delay: hop.arrival, duration: FADE_MS, fill: 'backwards' })
    })

    for (const node of flow.lit) {
      for (const name of ['draw-cw', 'draw-ccw']) {
        const path = part(`[data-node="${node}"]`, name)
        const length = Number.parseFloat(path?.style.getPropertyValue('--outline') ?? '')
        if (!path || !Number.isFinite(length)) continue
        // Each direction draws half the outline, so the two meet on the far side of the card.
        run(
          path,
          [{ strokeDashoffset: `${length}px` }, { strokeDashoffset: `${length / 2}px` }],
          { delay: arrival[node] ?? 0, duration: DRAW_MS, easing: SETTLE_EASE, fill: 'backwards' },
        )
      }
    }
  }

  onBeforeUnmount(cancel)
  return { play, cancel }
}
