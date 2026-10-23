// The Script, with the line that runs now highlighted: a soft band and the accent rule slide from
// line to line as execution moves, so the eye always knows which code produced the move on screen.
import type { CodeRow, LessonPlan } from '../../lesson-types'
import type { FilmClock, FrameInfo } from '../film-clock'
import type { Layout } from '../layout'
import { easeOut, lerp, span } from '../lib/ease'
import { el, place, setStroke, svgEl } from '../lib/dom'
import { sketchRect } from '../lib/sketch'

const KEYWORDS = new Set(
  'const let var function async await return new if else while for of in true false null undefined this typeof instanceof yield import export default class'.split(' '),
)

/** Splits one row into coloured spans (the app's editor palette). */
function highlight(text: string): string {
  const out: string[] = []
  const re = /(\/\/.*$)|('(?:[^'\\]|\\.)*'?|"(?:[^"\\]|\\.)*"?|`[^`]*`?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|(.)/g
  let m: RegExpExecArray | null
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  while ((m = re.exec(text))) {
    const [tok, comment, str, num, ident] = m
    if (comment) out.push(`<span class="syn-comment">${esc(tok)}</span>`)
    else if (str) out.push(`<span class="syn-string">${esc(tok)}</span>`)
    else if (num) out.push(`<span class="syn-number">${esc(tok)}</span>`)
    else if (ident) out.push(`<span class="${KEYWORDS.has(tok) ? 'syn-keyword' : 'syn-ident'}">${esc(tok)}</span>`)
    else if (/\s/.test(tok)) out.push(tok)
    else out.push(`<span class="syn-punct">${esc(tok)}</span>`)
  }
  return out.join('')
}

export function createCodePanel(stage: HTMLElement, strokes: SVGSVGElement, plan: LessonPlan, clock: FilmClock, layout: Layout) {
  const r = layout.code
  const root = el('div', 'panel panel-code', stage)
  Object.assign(root.style, { width: `${r.w}px`, height: `${r.h}px` })
  const head = el('div', 'panel-head', root)
  el('div', 'panel-title', head).textContent = plan.labels.code!
  const body = el('div', 'code-body', root)
  body.style.setProperty('--row', `${layout.codeRow}px`)
  body.style.setProperty('--code-font', `${layout.codeFont}px`)
  const band = el('div', 'code-band', body)
  const rows = plan.code.map((row: CodeRow) => {
    const line = el('div', 'code-row', body)
    const num = el('span', 'code-num', line)
    num.textContent = row.number === null ? '' : String(row.number)
    const text = el('span', 'code-text', line)
    text.innerHTML = highlight(row.text)
    return line
  })
  const border = svgEl('path', { class: 'stroke stroke-ink' }, strokes)
  const d = sketchRect('code', r.x, r.y, r.w, r.h)

  /** Middle of the rows a source line covers, as a row offset (fractional for wrapped lines). */
  const rowsOf = (sourceLine: number | null) => {
    if (sourceLine === null) return null
    const idx = plan.code.map((row, i) => (row.sourceLine === sourceLine ? i : -1)).filter((i) => i >= 0)
    return idx.length ? { top: idx[0]!, count: idx.length } : null
  }

  function render(frame: FrameInfo) {
    const draw = easeOut(span(frame.t, 0.3, 1.5))
    const dimmed = frame.scene === 'recap' ? 1 - span(frame.t, clock.sceneStart('recap'), clock.sceneStart('recap') + 0.7) : 1
    place(root, r.x, r.y, Math.min(1, draw * 1.5) * dimmed)
    setStroke(border, d, draw, dimmed)
    // Rows are written in top to bottom during the intro.
    rows.forEach((row, i) => {
      const at = 0.9 + i * 0.12
      const p = easeOut(span(frame.t, at, at + 0.5))
      row.style.opacity = String(p)
      row.style.transform = `translateX(${lerp(-14, 0, p).toFixed(1)}px)`
    })
    const a = rowsOf(frame.from.line)
    const b = rowsOf(frame.to.line)
    const showing = frame.scene === 'execute' && (a || b)
    if (!showing) {
      band.style.opacity = '0'
      return
    }
    const start = a ?? b!
    const end = b ?? a!
    const top = lerp(start.top, end.top, frame.p)
    const count = lerp(start.count, end.count, frame.p)
    const fade = a && b ? 1 : a ? 1 - frame.p : frame.p
    band.style.opacity = String(fade)
    band.style.transform = `translateY(${(top * layout.codeRow).toFixed(2)}px)`
    band.style.height = `${(count * layout.codeRow).toFixed(2)}px`
  }

  return { render }
}
