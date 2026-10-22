// Tiny DOM helpers. Shots build their tree once, then only write transforms, opacity and text.

export function h(tag, attrs = {}, ...children) {
  const svg = ['svg', 'path', 'rect', 'g', 'circle', 'line'].includes(tag)
  const el = svg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'style') for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? el.style.setProperty(sk, sv) : (el.style[sk] = sv)
    else if (k === 'text') el.textContent = v
    else if (k === 'html') el.innerHTML = v
    else el.setAttribute(k, v)
  }
  for (const c of children.flat()) if (c != null) el.append(c)
  return el
}

// Writes a transform from parts; keeps call sites short and readable.
export function tf(el, { x = 0, y = 0, s = 1, sx, sy, r = 0, skx = 0 } = {}) {
  el.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg) skewX(${skx}deg) scale(${sx ?? s}, ${sy ?? s})`
}

export function show(el, on) {
  el.style.visibility = on ? 'visible' : 'hidden'
}

// Clip-path inset wipe: `p` = revealed fraction from the given side.
export function wipe(el, p, from = 'bottom') {
  const hidden = `${(1 - p) * 100}%`
  const inset = { top: `0 0 ${hidden} 0`, bottom: `${hidden} 0 0 0`, left: `0 ${hidden} 0 0`, right: `0 0 0 ${hidden}` }[from]
  el.style.clipPath = `inset(${inset})`
}

// Type-on: shows the first n characters, never a fade.
export function typeOn(el, text, p) {
  const n = Math.round(text.length * Math.min(1, Math.max(0, p)))
  if (el.textContent !== text.slice(0, n)) el.textContent = text.slice(0, n)
}
