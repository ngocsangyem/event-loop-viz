// Loop (beats 4–8): out of the dive, a huge orange ring snaps down into the square loop; on beat 5
// its top-right corner breaks off as the orange block (the logo); the title lands; the block runs a
// lap of the loop; then the camera dives through the loop's hollow into the run.
import { h, tf, wipe, typeOn } from '../lib/dom.js'
import { ease, spring, lerp, clamp01, shake } from '../lib/time.js'

const SIZE = 600
const LEFT = 1210
const TOP = 240
// Block corners in the logo's 256-unit grid, clockwise from its home (top right).
const CORNERS = [
  [160, 40],
  [160, 160],
  [40, 160],
  [40, 40],
  [160, 40],
]

export function createLoopShot(stage, clock) {
  const ring = h('rect', { x: 58, y: 58, width: 140, height: 140, fill: 'none', stroke: 'var(--now)', 'stroke-width': 36 })
  const loopPath = h('path', { fill: 'var(--ink)', d: 'M40 40H148V76H76V180H180V108H216V216H40Z' })
  const block = h('rect', { x: 0, y: 0, width: 56, height: 56, fill: 'var(--now)' })
  const ringG = h('g', {}, ring)
  const logoG = h('g', {}, loopPath)
  const svg = h('svg', { class: 'abs', viewBox: '0 0 256 256', width: SIZE, height: SIZE, style: { left: `${LEFT}px`, top: `${TOP}px`, overflow: 'visible' } }, ringG, logoG, block)

  const line1 = h('div', { class: 'display', style: { fontSize: '236px' }, text: 'the event' })
  const line2 = h('div', { class: 'display', style: { fontSize: '236px' }, text: 'loop' })
  const m1 = h('div', { class: 'abs mask', style: { left: '100px', top: '300px', paddingBottom: '30px' } }, line1)
  const m2 = h('div', { class: 'abs mask', style: { left: '100px', top: '520px', paddingBottom: '30px' } }, line2)
  const sub = h('div', { class: 'abs label', style: { left: '112px', top: '820px', fontSize: '30px', color: 'var(--ink-2)' } })
  const title = h('div', { class: 'abs' }, m1, m2, sub)
  const cam = h('div', { class: 'cam' }, title, svg)
  const el = h('div', { class: 'shot' }, cam)
  stage.append(el)

  const SUB = 'call stack · microtasks · tasks'
  const cx = LEFT + SIZE / 2
  const cy = TOP + SIZE / 2

  return {
    name: 'loop',
    el,
    render(t) {
      const s4 = clock.since(t, 4)
      const broken = t >= clock.b(5)

      // Beat 4: the ring arrives from beyond the frame and springs to size while it squares off.
      const pr = spring(s4, { freq: 2.4, damp: 0.6 })
      ringG.setAttribute('transform', `rotate(${lerp(-90, 0, pr)} 128 128) translate(128 128) scale(${lerp(7, 1, pr)}) translate(-128 -128)`)
      const rx = lerp(70, 0, clock.prog(t, 4, 0.36, ease.inOutExpo))
      ring.setAttribute('rx', rx)
      ring.setAttribute('ry', rx)
      ringG.style.visibility = broken ? 'hidden' : 'visible'
      logoG.style.visibility = broken ? 'visible' : 'hidden'

      // Beat 5: the corner snaps off. The loop recoils; the block flies out and springs home.
      const s5 = clock.since(t, 5)
      const recoil = 1 + 0.07 * Math.exp(-Math.max(0, s5) * 9) * (broken ? 1 : 0)
      logoG.setAttribute('transform', `translate(128 128) scale(${recoil}) translate(-128 -128)`)
      const pb = spring(s5, { freq: 3, damp: 0.38 })
      let [bx, by] = CORNERS[0]
      let rot = 0
      if (broken) {
        bx += (1 - pb) * 90
        by -= (1 - pb) * 90
        rot = (1 - pb) * 70
      }
      // Beats 6–7: the block runs one lap of the loop in four snapped hops (sixteenth notes).
      const lap = clock.since(t, 6) / clock.period
      if (lap > 0 && lap < 1) {
        const k = Math.min(3, Math.floor(lap * 4))
        const p = ease.outExpo(clamp01((lap * 4 - k) / 0.7))
        bx = lerp(CORNERS[k][0], CORNERS[k + 1][0], p)
        by = lerp(CORNERS[k][1], CORNERS[k + 1][1], p)
        rot = lerp(0, 90, p)
      }
      block.setAttribute('transform', `translate(${bx} ${by}) rotate(${rot} 28 28)`)
      block.style.visibility = broken ? 'visible' : 'hidden'

      // Beat 6: the title is pushed up through masks, word by word on eighths.
      for (const [m, n, beat] of [
        [m1, line1, 6],
        [m2, line2, 6.5],
      ]) {
        const p = clock.prog(t, beat, 0.3, ease.outExpo)
        wipe(m, p, 'bottom')
        tf(n, { y: (1 - p) * 250 })
        m.style.visibility = t >= clock.b(beat) ? 'visible' : 'hidden'
      }
      typeOn(sub, SUB, clock.prog(t, 6.5, clock.period * 1.2, ease.linear))

      // Beat 7 → 8: the title is shoved off left; the camera turns and dives through the loop's hollow.
      const pe = clock.prog(t, 7, clock.period, ease.inExpo)
      tf(title, { x: -1900 * pe })
      const s = Math.exp(Math.log(14) * pe)
      const [kx, ky] = shake(t, clock.b(5), 12, 11, 5)
      cam.style.transformOrigin = `${cx}px ${cy}px`
      cam.style.transform = `translate(${kx + lerp(0, 960 - cx, pe)}px, ${ky}px) rotate(${-90 * ease.inCubic(pe)}deg) scale(${s})`
    },
  }
}
