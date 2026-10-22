// Reorder (beats 18–24): the four source lines slam in in source order; on each beat one line is
// claimed by the run, stamped with its run number and pulled up into place. Beat 23 cuts to the
// printed output, coloured by why each line ran when it did.
import { h, tf, wipe } from '../lib/dom.js'
import { ease, spring, lerp, clamp01 } from '../lib/time.js'
import { SCRIPT, RUN_ORDER } from '../cues.js'

const ROW_Y = (r) => 270 + r * 180
const LANE_HUE = { console: 'var(--console)', task: 'var(--task)', job: 'var(--job)' }
// Output colours say why: sync lines in stack yellow, the Job in magenta, the Task in blue.
const WHY = [
  { text: 'start', hue: 'var(--stack)', tag: 'sync' },
  { text: 'end', hue: 'var(--stack)', tag: 'sync' },
  { text: 'promise', hue: 'var(--job)', tag: 'microtask' },
  { text: 'timeout', hue: 'var(--task)', tag: 'task' },
]

// Row of `line` after `step` lines have been claimed (step 0 = source order).
function rowOf(line, step) {
  const claimed = RUN_ORDER.slice(0, step)
  if (claimed.includes(line)) return claimed.indexOf(line)
  const rest = [0, 1, 2, 3].filter((l) => !claimed.includes(l))
  return step + rest.indexOf(line)
}

export function createReorderShot(stage, clock) {
  const head = h('div', { class: 'abs label', style: { left: '112px', top: '150px', fontSize: '34px', color: 'var(--ink-3)' } })
  const rows = SCRIPT.map((s, i) => {
    const num = h('div', { class: 'abs mono', style: { left: '0px', top: '8px', width: '96px', fontSize: '50px', fontWeight: 700, textAlign: 'right' } })
    const sq = h('div', { class: 'abs', style: { left: '128px', top: '30px', width: '22px', height: '22px', background: LANE_HUE[s.lands] } })
    const code = h('div', { class: 'abs mono', style: { left: '178px', top: '0px', fontSize: '60px', fontWeight: 500, whiteSpace: 'nowrap' }, text: s.code })
    const out = h('div', { class: 'abs mono', style: { left: '1530px', top: '0px', fontSize: '60px', fontWeight: 500, color: 'var(--console)' }, text: s.out })
    const el = h('div', { class: 'abs', style: { left: '40px', height: '80px', width: '1840px' } }, num, sq, code, out)
    return { el, num, code, out }
  })
  const list = h('div', { class: 'abs' }, rows.map((r) => r.el))

  const words = WHY.map((w) => {
    const word = h('div', { class: 'display', style: { fontSize: '196px', color: w.hue }, text: w.text })
    const tag = h('div', { class: 'label', style: { fontSize: '30px', color: 'var(--ink-3)', marginLeft: '36px', alignSelf: 'flex-end', paddingBottom: '28px' }, text: w.tag })
    const m = h('div', { class: 'abs mask', style: { display: 'flex', left: '96px', paddingBottom: '24px' } }, word, tag)
    return { m, word }
  })
  const finale = h('div', { class: 'abs' }, words.map((w) => w.m))
  const cam = h('div', { class: 'cam' }, head, list, finale)
  const el = h('div', { class: 'shot' }, cam)
  stage.append(el)

  return {
    name: 'reorder',
    el,
    render(t) {
      const step = Math.max(0, Math.min(4, Math.floor(clock.beatAt(t) + 1e-6) - 18))
      const isFinale = t >= clock.b(23)
      list.style.display = head.style.display = isFinale ? 'none' : ''
      finale.style.display = isFinale ? '' : 'none'
      head.textContent = step === 0 ? 'source order' : `run order · ${step} of 4`

      rows.forEach((r, line) => {
        // Rows enter from the left through their own width on beat 18, staggered by 40 ms.
        const pin = clock.prog(t, 18, 0.34, ease.outExpo, line * 0.04)
        // Each step re-slots rows on a spring; the claimed row swings out to the right as it moves.
        const sStep = step > 0 ? clock.since(t, 18 + step) : 0
        const from = ROW_Y(rowOf(line, Math.max(0, step - 1)))
        const to = ROW_Y(rowOf(line, step))
        const p = step > 0 ? spring(sStep, { freq: 3.3, damp: 0.6 }) : 1
        const claimedNow = step > 0 && RUN_ORDER[step - 1] === line
        const swing = claimedNow ? Math.sin(Math.PI * clamp01(sStep / 0.32)) * 70 : 0
        tf(r.el, { x: lerp(-1900, 0, pin) + swing, y: lerp(from, to, p), skx: claimedNow ? (1 - clamp01(sStep / 0.3)) * -8 : 0 })

        const runIdx = RUN_ORDER.indexOf(line)
        const stamped = runIdx < step
        r.num.textContent = stamped ? String(runIdx + 1) : String(line + 1).padStart(2, '0')
        r.num.style.color = claimedNow ? 'var(--now)' : stamped ? 'var(--ink)' : 'var(--ink-4)'
        const ns = claimedNow ? lerp(2.4, 1, spring(sStep, { freq: 3.6, damp: 0.45 })) : 1
        r.num.style.transformOrigin = '100% 50%'
        tf(r.num, { s: ns })
        r.code.style.color = stamped ? 'var(--ink)' : 'var(--ink-3)'
        r.out.style.visibility = stamped ? 'visible' : 'hidden'
        tf(r.out, { x: stamped ? (1 - ease.outExpo(clamp01((claimedNow ? sStep : 1) / 0.25))) * 120 : 0 })
      })

      // Beat 23: the output, one word per sixteenth, each pushed up through its mask.
      words.forEach((w, k) => {
        const at = 23 + k / 4
        const p = clock.prog(t, at, 0.16, ease.outExpo)
        w.m.style.visibility = t >= clock.b(at) ? 'visible' : 'hidden'
        w.m.style.top = `${92 + k * 224}px`
        wipe(w.m, p, 'bottom')
        tf(w.word, { y: (1 - p) * 220 })
      })
      const sf = clock.since(t, 23)
      cam.style.transform = isFinale ? `scale(${1 + 0.04 * clamp01(sf / clock.period)})` : 'none'
    },
  }
}
