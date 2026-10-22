// Logo (beats 28–32): the square loop slams in on the downbeat and the orange block drops into its
// corner; the wordmark types on; the tagline wipes in; the block blinks once like a cursor and holds.
import { h, tf, wipe, typeOn } from '../lib/dom.js'
import { ease, spring, lerp, clamp01, shake } from '../lib/time.js'

const WORDMARK = ['event loop', 'visualizer']
const TOTAL = WORDMARK.join('').length
const MARK_X = 560
const MARK_Y = [300, 470]

export function createLogoShot(stage, clock) {
  const loopPath = h('path', { fill: 'var(--ink)', d: 'M40 40H148V76H76V180H180V108H216V216H40Z' })
  const block = h('rect', { x: 160, y: 40, width: 56, height: 56, fill: 'var(--now)' })
  const loopG = h('g', {}, loopPath)
  const svg = h('svg', { class: 'abs', viewBox: '0 0 256 256', width: 470, height: 470, style: { left: '64px', top: '290px', overflow: 'visible' } }, loopG, block)
  const markStyle = { fontSize: '168px', fontWeight: 600, letterSpacing: '-0.04em', whiteSpace: 'nowrap', lineHeight: 1 }
  const marks = WORDMARK.map((_, i) => h('div', { class: 'abs', style: { ...markStyle, left: `${MARK_X}px`, top: `${MARK_Y[i]}px` } }))
  const cursor = h('div', { class: 'abs', style: { width: '12px', height: '150px', background: 'var(--now)' } })
  const tagline = h('div', { class: 'abs label', style: { left: '568px', top: '690px', fontSize: '34px', color: 'var(--ink-2)', whiteSpace: 'nowrap' }, text: 'paste a script. replay every tick.' })
  const meta = h('div', { class: 'abs label', style: { left: '568px', top: '752px', fontSize: '24px', color: 'var(--ink-3)', whiteSpace: 'nowrap' }, text: 'call stack · microtasks · tasks · chrome 155 model' })
  const cam = h('div', { class: 'cam' }, svg, marks, cursor, tagline, meta)
  const el = h('div', { class: 'shot' }, cam)
  stage.append(el)

  // Measures typed text width so the cursor sits right after the last typed character.
  const probe = h('span', { style: { visibility: 'hidden', position: 'absolute', font: "600 168px 'Inter'", letterSpacing: '-0.04em', whiteSpace: 'nowrap' } })
  stage.append(probe)
  const widths = []

  return {
    name: 'logo',
    el,
    measure() {
      for (const line of WORDMARK) {
        const w = []
        for (let n = 0; n <= line.length; n++) {
          probe.textContent = line.slice(0, n)
          w.push(probe.getBoundingClientRect().width)
        }
        widths.push(w)
      }
      probe.remove()
    },
    render(t) {
      const s28 = clock.since(t, 28)
      // Downbeat: the loop slams from 1.6× with a heavy spring.
      const ps = spring(s28, { freq: 2.8, damp: 0.5 })
      loopG.setAttribute('transform', `translate(128 128) scale(${lerp(1.6, 1, ps)}) translate(-128 -128)`)
      // The block falls into its corner 120 ms later, squashes and settles.
      const fall = clamp01((s28 - 0.0) / 0.14)
      const landS = s28 - 0.14
      const squash = landS > 0 ? 0.25 * Math.exp(-landS * 13) * Math.cos(landS * 30) : 0
      const by = lerp(-520, 0, ease.inQuart(fall))
      block.setAttribute('transform', `translate(0 ${by}) translate(188 96) scale(${1 + squash} ${1 - squash}) translate(-188 -96)`)

      // Beat 31: one cursor-blink of the block: off for an eighth, back on the "and".
      const blinkOff = t >= clock.b(31) && t < clock.b(31.5)
      block.style.visibility = blinkOff ? 'hidden' : 'visible'

      // Beat 29: wordmark types on (with a terminal cursor in accent orange).
      const typed = Math.round(TOTAL * clamp01(clock.since(t, 29) / 0.36))
      const n0 = Math.min(typed, WORDMARK[0].length)
      const n1 = typed - n0
      typeOn(marks[0], WORDMARK[0], n0 / WORDMARK[0].length)
      typeOn(marks[1], WORDMARK[1], n1 / WORDMARK[1].length)
      const row = n1 > 0 ? 1 : 0
      cursor.style.visibility = t >= clock.b(29) && t < clock.b(30) ? 'visible' : 'hidden'
      cursor.style.left = `${MARK_X + widths[row][row ? n1 : n0] + 12}px`
      cursor.style.top = `${MARK_Y[row] + 16}px`

      // Beat 30: tagline and meta wipe in from the left, an eighth apart.
      for (const [n, beat] of [
        [tagline, 30],
        [meta, 30.5],
      ]) {
        const p = clock.prog(t, beat, 0.3, ease.outExpo)
        n.style.visibility = t >= clock.b(beat) ? 'visible' : 'hidden'
        wipe(n, p, 'left')
        tf(n, { x: (1 - p) * -40 })
      }

      // A slow push holds the frame alive to the last frame.
      const push = lerp(1, 1.035, clamp01(s28 / (clock.period * 4)))
      const [kx, ky] = shake(t, clock.b(28), 18, 8, 28)
      cam.style.transformOrigin = '300px 525px'
      cam.style.transform = `translate(${kx}px, ${ky}px) scale(${push})`
    },
  }
}
