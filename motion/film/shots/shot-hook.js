// Hook (beats 0–4): setTimeout(fn, 0) is on screen at frame 0, promise.then(fn) slams in under it,
// "who runs first?" lands, then the camera dives through the orange 0 into the next shot.
import { h, tf, wipe } from '../lib/dom.js'
import { ease, spring, lerp, clamp01, shake } from '../lib/time.js'

// The 0 is drawn, not typed, so the dive can scale it 50× and stay a crisp ring.
function zeroGlyph() {
  return h(
    'span',
    { style: { display: 'inline-block', width: '0.6em', height: '0.73em', position: 'relative' } },
    h('svg', { viewBox: '0 0 60 73', width: '100%', height: '100%', style: { position: 'absolute', inset: 0, overflow: 'visible' } },
      h('rect', { x: 9, y: 4.5, width: 42, height: 64, rx: 21, fill: 'none', stroke: 'var(--now)', 'stroke-width': 9 })),
  )
}

function tag(text, hue) {
  return h('span', { class: 'label', style: { fontSize: '30px', color: hue, display: 'inline-flex', alignItems: 'center', gap: '14px', marginLeft: '44px', verticalAlign: '0.9em' } },
    h('span', { style: { width: '16px', height: '16px', background: hue, display: 'inline-block' } }), text)
}

export function createHookShot(stage, clock) {
  const zero = zeroGlyph()
  const fnA = h('span', { style: { color: 'var(--timer)' }, text: 'setTimeout' })
  const tagA = tag('task', 'var(--task)')
  const lineA = h('div', { class: 'abs mono', style: { fontSize: '150px', fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' } }, fnA, '(fn, ', zero, ')', tagA)
  const thenB = h('span', { style: { color: 'var(--job)' }, text: '.then' })
  const tagB = tag('job', 'var(--job)')
  const lineB = h('div', { class: 'abs mono', style: { fontSize: '150px', fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' } }, 'promise', thenB, '(fn)', tagB)
  const q = h('div', { class: 'display', style: { fontSize: '214px' }, text: 'who runs first?' })
  const qMask = h('div', { class: 'abs mask', style: { left: '104px', top: '730px', padding: '0 20px 40px 0' } }, q)
  const meta = h('div', { class: 'abs label', style: { left: '124px', top: '200px', fontSize: '34px', color: 'var(--ink-3)' }, text: 'two callbacks · one event loop' })
  const cam = h('div', { class: 'cam' }, meta, lineA, lineB, qMask)
  const el = h('div', { class: 'shot' }, cam)
  stage.append(el)

  const A = { x: 112, y: 300 }
  const Bp = { x: 112, y: 500 }
  let zc = { x: 960, y: 540 }

  return {
    name: 'hook',
    el,
    measure() {
      tf(lineA, A)
      const r = zero.getBoundingClientRect()
      const s = stage.getBoundingClientRect()
      zc = { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 }
    },
    render(t) {
      const P = clock.period
      // Frame 0 already shows line A mid-slam: it drops 1.15× → 1× on a stiff spring.
      const sA = lerp(1.16, 1, spring(t + 0.02, { freq: 3.6, damp: 0.5 }))
      // Line B slams up on beat 1; line A gets knocked up and settles.
      const sinceB = clock.since(t, 1)
      const kick = sinceB > 0 ? Math.sin(Math.min(1, sinceB / 0.35) * Math.PI) * Math.exp(-sinceB * 6) : 0
      tf(lineA, { x: A.x, y: A.y - kick * 34, s: sA })
      lineA.style.transformOrigin = `${zc.x - A.x}px ${zc.y - A.y}px`
      const pB = spring(sinceB, { freq: 3.4, damp: 0.55 })
      tf(lineB, { x: Bp.x, y: Bp.y + (1 - pB) * 700, skx: (1 - pB) * -10 })
      lineB.style.visibility = sinceB >= 0 ? 'visible' : 'hidden'
      meta.style.visibility = t < clock.b(2) ? 'visible' : 'hidden'

      // Beat 2: the question lands; everything but the 0 drops to ink-3 so the 0 is the focal point.
      const asked = t >= clock.b(2)
      for (const n of [lineA, lineB]) n.style.color = asked ? 'var(--ink-4)' : 'var(--ink)'
      fnA.style.color = asked ? 'var(--ink-4)' : 'var(--timer)'
      thenB.style.color = asked ? 'var(--ink-4)' : 'var(--job)'
      tagA.style.visibility = tagB.style.visibility = asked ? 'visible' : 'hidden'
      const pq = clock.prog(t, 2, 0.22, ease.outExpo)
      wipe(qMask, pq, 'bottom')
      tf(q, { y: (1 - pq) * 140 })
      qMask.style.visibility = asked ? 'visible' : 'hidden'

      // Beat 3 → 4: anticipation pull-back, then an exponential dive through the 0's counter.
      const p = clamp01(clock.since(t, 3) / P)
      let s = 1
      if (p > 0) s = p < 0.18 ? lerp(1, 0.93, ease.outCubic(p / 0.18)) : 0.93 * Math.exp(Math.log(60 / 0.93) * ease.inExpo((p - 0.18) / 0.82))
      const [kx, ky] = shake(t, 0, 16, 10, 1)
      const [bx, by] = shake(t, clock.b(1), 10, 12, 2)
      const rot = p > 0.18 ? ease.inCubic((p - 0.18) / 0.82) * 12 : 0
      cam.style.transformOrigin = `${zc.x}px ${zc.y}px`
      cam.style.transform = `translate(${kx + bx}px, ${ky + by}px) rotate(${rot}deg) scale(${s})`
    },
  }
}
