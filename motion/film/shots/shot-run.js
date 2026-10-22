// Run (beats 8–18): the sample Script plays through the four lanes, one Trace step per beat.
// Frames drop onto the stack, callbacks travel to their queue, the checkpoint drains the Job before
// the loop's next tick takes the Task. The camera reframes on every beat.
import { h, tf, wipe } from '../lib/dom.js'
import { ease, spring, lerp, clamp01, shake } from '../lib/time.js'
import { LANES, LANE_W, LANE_TOP, LANE_H, HEADER_H, VIEW_TOP, CHIPS, CONSOLE_LINES, CAPTIONS, PHASES, chipAt, cameraAt, slotXY } from './shot-run-model.js'

function chipEl(c, ghost = false) {
  const state = h('span', {})
  const el = h('div', { class: `chip${ghost ? ' ghost' : ''}`, style: { '--hue': c.hue } },
    h('div', { class: 'id' }, h('span', { text: c.id.toUpperCase() }), state), h('div', { class: 'code', text: c.code }))
  return { el, state }
}

// Beats on which each lane changes: arrivals, pops and console prints.
function changedLanes(beat) {
  const lanes = new Set()
  for (const c of CHIPS) {
    for (const k of c.path) if (Math.floor(k.beat) === beat) lanes.add(k.lane)
    if (c.pop != null && Math.floor(c.pop) === beat) lanes.add(c.path.at(-1).lane)
  }
  if (CONSOLE_LINES.some((l) => Math.floor(l.beat) === beat)) lanes.add(3)
  return lanes
}

export function createRunShot(stage, clock) {
  const meta = h('div', { class: 'abs label', style: { left: '112px', top: '60px', fontSize: '30px', color: 'var(--ink-3)' } })
  const capText = h('div', { class: 'cap', style: { whiteSpace: 'nowrap' } })
  const capMask = h('div', { class: 'abs mask', style: { left: '108px', top: '108px', height: '110px', width: '1800px' } }, capText)

  const lanes = LANES.map((l, i) => {
    const tint = h('div', { class: 'abs', style: { width: `${LANE_W}px`, height: `${LANE_H}px`, background: l.hue, opacity: 0.07 } })
    const rule = h('div', { class: 'abs', style: { width: `${LANE_W}px`, height: '4px', background: l.hue } })
    const state = h('span', { class: 'label', style: { fontSize: '22px', color: l.hue } })
    const header = h('div', { class: 'abs', style: { left: '30px', top: '26px', width: `${LANE_W - 60}px`, display: 'flex', alignItems: 'center', gap: '16px' } },
      h('span', { style: { width: '16px', height: '16px', background: l.hue } }),
      h('span', { class: 'label', style: { fontSize: '30px', color: 'var(--ink)', flex: 1 }, text: l.label }), state)
    const lines = h('div', { class: 'abs', style: { width: `${LANE_W}px`, height: `${LANE_H}px`, borderLeft: i ? '1px solid var(--line)' : 'none', borderTop: '1px solid var(--line)' } },
      h('div', { class: 'abs', style: { top: `${HEADER_H}px`, width: `${LANE_W}px`, borderTop: '1px solid var(--line-soft)' } }))
    const box = h('div', { class: 'abs', style: { left: `${i * LANE_W}px`, top: `${LANE_TOP}px`, width: `${LANE_W}px`, height: `${LANE_H}px` } }, tint, lines, rule, header)
    return { box, tint, rule, state }
  })

  const ghosts = CHIPS.filter((c) => c.ghost).map((c) => ({ c, ...chipEl(c, true) }))
  const chips = CHIPS.map((c) => ({ c, ...chipEl(c) }))
  const logs = CONSOLE_LINES.map((l, k) => {
    const text = h('span', { style: { color: 'var(--console)' }, text: l.text })
    const el = h('div', { class: 'abs mono', style: { left: `${3 * LANE_W + 34}px`, top: `${LANE_TOP + HEADER_H + 30 + k * 92}px`, fontSize: '58px', fontWeight: 500, display: 'flex', alignItems: 'baseline', gap: '22px' } },
      h('span', { class: 'label', style: { fontSize: '22px', color: 'var(--ink-3)' }, text: 'log' }), text)
    return { l, el }
  })
  const sweep = h('div', { class: 'abs', style: { width: '14px', height: `${LANE_H}px`, top: `${LANE_TOP}px`, background: 'var(--now)' } })

  const phases = PHASES.map((p) => h('span', { class: 'label', style: { fontSize: '28px' }, text: p.label }))
  const strip = h('div', { class: 'abs', style: { left: '30px', top: `${LANE_TOP + LANE_H + 24}px`, display: 'flex', gap: '56px' } }, phases)

  // Camera moves the lanes only; the caption is a fixed HUD above the clipped viewport.
  const cam = h('div', { class: 'cam' }, lanes.map((l) => l.box), ghosts.map((g) => g.el), chips.map((c) => c.el), logs.map((l) => l.el), sweep, strip)
  const view = h('div', { class: 'shot', style: { clipPath: `inset(${VIEW_TOP}px 0 0 0)` } }, cam)
  const el = h('div', { class: 'shot' }, meta, capMask, view)
  stage.append(el)

  return {
    name: 'run',
    el,
    render(t) {
      const beat = Math.floor(clock.beatAt(t) + 1e-6)

      // Caption: the line under the playhead, pushed up through a mask on its beat.
      const cap = [...CAPTIONS].reverse().find((c) => t >= clock.b(c.beat)) ?? CAPTIONS[0]
      if (capText.dataset.beat !== String(cap.beat)) {
        capText.dataset.beat = String(cap.beat)
        capText.innerHTML = cap.html
        capText.className = `cap ${cap.kind}`
        meta.textContent = cap.meta
      }
      const pc = clock.prog(t, cap.beat, 0.2, ease.outExpo)
      wipe(capMask, pc, 'bottom')
      tf(capText, { y: (1 - pc) * 110 })

      // Lanes draw in from the top on beat 8; a lane changed on this beat gets its tint and rule.
      const changed = changedLanes(beat)
      lanes.forEach((l, i) => {
        wipe(l.box, clock.prog(t, 8, 0.32, ease.outExpo, i * 0.035), 'top')
        const on = changed.has(i)
        l.tint.style.visibility = l.rule.style.visibility = on ? 'visible' : 'hidden'
        l.state.textContent = on ? (i === 0 && beat !== 12 ? 'running' : 'changed') : ''
      })

      // Chips. The top resting frame on the stack is the one running now (orange).
      const states = chips.map(({ c }) => chipAt(c, t, clock))
      const top = states.reduce((best, s, i) => (s.visible && !s.travelling && s.x < LANE_W && s.popP === 0 && (best < 0 || s.y < states[best].y) ? i : best), -1)
      chips.forEach(({ c, el: ce, state }, i) => {
        const s = states[i]
        ce.style.visibility = s.visible ? 'visible' : 'hidden'
        if (!s.visible) return
        const arrived = [...c.path].reverse().find((k) => t >= clock.b(k.beat))
        const sa = arrived ? t - clock.b(arrived.beat) : 1
        const squash = sa >= 0 && sa < 0.4 ? 0.12 * Math.exp(-sa * 14) : 0
        tf(ce, { x: s.x, y: s.y, r: s.rot, sx: 1 + squash * 0.6 + s.popP * 0.15, sy: 1 - squash - s.popP })
        const isNew = arrived && arrived.lane > 0 && sa < clock.period
        state.textContent = i === top ? 'running' : isNew ? 'new' : ''
        state.style.color = i === top ? 'var(--now)' : c.hue
        ce.style.borderLeftColor = i === top ? 'var(--now)' : c.hue
      })
      for (const g of ghosts) {
        const on = t >= clock.b(g.c.ghost.from) && t < clock.b(g.c.ghost.to)
        g.el.style.visibility = on ? 'visible' : 'hidden'
        tf(g.el, slotXY(g.c.ghost.lane, g.c.ghost.slot))
      }

      // Console lines type on in two snaps: tag first, then the value slams in from the right.
      for (const { l, el: le } of logs) {
        const s = t - clock.b(l.beat)
        le.style.visibility = s >= 0 ? 'visible' : 'hidden'
        tf(le, { x: (1 - ease.outExpo(clamp01(s / 0.22))) * 160 })
      }

      // Beat 15: the loop turns. An orange scan sweeps the lanes and the camera whips with it.
      const ps = clock.prog(t, 15, clock.period * 0.9, ease.inOutExpo, -0.12)
      sweep.style.visibility = ps > 0 && ps < 1 ? 'visible' : 'hidden'
      tf(sweep, { x: lerp(-20, 1920, ps) })

      PHASES.forEach((p, i) => {
        const on = beat >= p.from && beat < p.to
        phases[i].style.color = on ? p.hue : 'var(--ink-4)'
      })

      const c = cameraAt(t, clock)
      const intro = spring(clock.since(t, 8), { freq: 2.1, damp: 0.72 })
      const s = lerp(2.4, c.s, intro) * (1 + 0.022 * Math.exp(-Math.max(0, clock.since(t, beat)) * 9))
      const tx = s >= 1 ? Math.min(0, Math.max(1920 - 1920 * s, -c.left * s)) : 960 - 960 * s
      // Vertical framing keeps the lane tops below the caption and the phase strip above the edge.
      const lo = VIEW_TOP + 10 - LANE_TOP * s
      const hi = 1070 - (LANE_TOP + LANE_H + 60) * s
      const ty = lo <= hi ? Math.min(hi, Math.max(lo, 665 - 640 * s)) : (lo + hi) / 2
      const [kx, ky] = shake(t, clock.b(beat), 5, 14, beat)
      cam.style.transform = `translate(${tx + kx}px, ${ty + ky}px) rotate(${(1 - intro) * -14}deg) scale(${s})`
    },
  }
}
