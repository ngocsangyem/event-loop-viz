// Rule (beats 24–28): the loop's rule lands as a stack of words, one per beat. Each new word slams
// in from below and pushes the earlier ones up and smaller. Beat 27 runs the loop: the highlight
// steps through the three phases on sixteenths while the drums drop out.
import { h, tf } from '../lib/dom.js'
import { ease, spring, lerp, clamp01, shake } from '../lib/time.js'

const WORDS = [
  { text: 'sync code', hue: 'var(--stack)', n: '01' },
  { text: 'every microtask', hue: 'var(--job)', n: '02' },
  { text: 'one task', hue: 'var(--task)', n: '03' },
]
// y (top) and scale by depth: 0 = newest at the bottom, 2 = oldest at the top.
const DEPTH = [
  { y: 600, s: 1 },
  { y: 390, s: 0.62 },
  { y: 240, s: 0.48 },
]

export function createRuleShot(stage, clock) {
  const items = WORDS.map((w) => {
    const word = h('div', { class: 'display', style: { fontSize: '228px', color: w.hue }, text: w.text })
    const num = h('div', { class: 'label', style: { fontSize: '30px', color: 'var(--ink-3)', marginBottom: '6px' }, text: w.n })
    const el = h('div', { class: 'abs', style: { left: '104px', transformOrigin: '0 0' } }, num, word)
    return { el, word, num }
  })
  const loopTag = h('div', { class: 'abs label', style: { left: '112px', top: '120px', fontSize: '30px', color: 'var(--now)' } })
  const cam = h('div', { class: 'cam' }, items.map((i) => i.el), loopTag)
  const el = h('div', { class: 'shot' }, cam)
  stage.append(el)

  return {
    name: 'rule',
    el,
    render(t) {
      const beatNow = Math.floor(clock.beatAt(t) + 1e-6)
      const landed = Math.max(1, Math.min(3, beatNow - 23))
      items.forEach((it, k) => {
        const since = clock.since(t, 24 + k)
        it.el.style.visibility = since >= 0 ? 'visible' : 'hidden'
        if (since < 0) return
        // Depth now and one beat ago; the push between them rides a spring from the newest beat.
        const depth = landed - 1 - k
        const prev = DEPTH[Math.max(0, depth - 1)]
        const cur = DEPTH[depth]
        const pPush = spring(clock.since(t, 24 + landed - 1), { freq: 3.4, damp: 0.62 })
        let y = lerp(prev.y, cur.y, depth === 0 ? 1 : pPush)
        let s = lerp(prev.s, cur.s, depth === 0 ? 1 : pPush)
        if (depth === 0) {
          // The newest word arrives from below the frame with a little overshoot and skew.
          const pIn = spring(since, { freq: 3.2, damp: 0.55 })
          y = lerp(1180, cur.y, pIn)
          it.word.style.transform = `skewX(${(1 - clamp01(since / 0.25)) * -12}deg)`
        } else it.word.style.transform = 'none'
        tf(it.el, { y, s })
      })

      // Beat 27: the loop runs. One phase lit per sixteenth, the rest at ink-4.
      const lb = clock.since(t, 27) / clock.period
      const looping = lb >= 0
      loopTag.textContent = looping ? `the loop · turn ${Math.min(4, Math.floor(lb * 4) + 1)}` : ''
      items.forEach((it, k) => {
        const lit = !looping || Math.floor(lb * 4) % 3 === (2 - k + 3) % 3
        it.word.style.color = lit ? WORDS[k].hue : 'var(--ink-4)'
      })

      const [kx, ky] = shake(t, clock.b(beatNow), beatNow === 27 ? 0 : 9, 12, beatNow + 40)
      const drift = lerp(1, 1.05, ease.linear(clamp01(clock.since(t, 24) / (clock.period * 4))))
      cam.style.transformOrigin = '0 1080px'
      cam.style.transform = `translate(${kx}px, ${ky}px) scale(${drift})`
    },
  }
}
