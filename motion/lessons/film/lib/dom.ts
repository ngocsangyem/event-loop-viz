// Tiny DOM helpers. Elements are built once; render functions only set styles and text.

export const SVG_NS = 'http://www.w3.org/2000/svg'

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, parent?: Element): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  parent?.append(node)
  return node
}

export function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v))
  parent?.append(node)
  return node
}

/** A full-stage SVG overlay for strokes. */
export function svgLayer(parent: Element, className: string): SVGSVGElement {
  return svgEl('svg', { class: className, width: 1920, height: 1080, viewBox: '0 0 1920 1080' }, parent)
}

/** Sets text only when it changed (keeps layout work low across 30 fps × minutes of frames). */
export function setText(node: Element, text: string) {
  if (node.textContent !== text) node.textContent = text
}

/** A stroke that can be drawn on: `progress` 0 hides it, 1 shows it whole. */
export function setStroke(path: SVGPathElement, d: string, progress: number, opacity = 1) {
  if (path.getAttribute('d') !== d) path.setAttribute('d', d)
  path.setAttribute('pathLength', '1')
  path.style.strokeDasharray = '1 1'
  path.style.strokeDashoffset = String(1 - Math.max(0, Math.min(1, progress)))
  path.style.opacity = String(progress <= 0 ? 0 : opacity)
}

export function place(node: HTMLElement, x: number, y: number, opacity = 1, extra = '') {
  node.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)${extra}`
  node.style.opacity = opacity.toFixed(3)
  node.style.visibility = opacity <= 0.001 ? 'hidden' : 'visible'
}
