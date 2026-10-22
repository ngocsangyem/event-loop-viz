import { EditorView } from '@codemirror/view'
import type { DriveSpot } from './drive-step'

/** A box in viewport pixels. */
export interface DriveRect {
  left: number
  top: number
  width: number
  height: number
}

const regionOf = (spot: DriveSpot): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-drive-target="${spot.target}"]`)

/** The CodeMirror view inside the Source pane, when the pane is on screen. */
function editorIn(region: HTMLElement): EditorView | null {
  const dom = region.querySelector<HTMLElement>('.cm-editor')
  return dom ? EditorView.findFromDOM(dom) : null
}

/** The rendered `.cm-line` of a 1-based line, or null when the line is out of range or not drawn. */
function lineElement(view: EditorView, line: number): HTMLElement | null {
  if (line < 1 || line > view.state.doc.lines) return null
  const { node } = view.domAtPos(view.state.doc.line(line).from)
  const el = node instanceof HTMLElement ? node : node.parentElement
  return el?.closest<HTMLElement>('.cm-line') ?? null
}

/**
 * The element a spot lights up: the region itself, or one Script line inside the Source pane.
 * A line falls back to the whole pane when it cannot be found, so a step never lights nothing.
 */
export function driveTargetElement(spot: DriveSpot): HTMLElement | null {
  const region = regionOf(spot)
  if (!region || spot.target !== 'source' || spot.line === undefined) return region
  const view = editorIn(region)
  return (view && lineElement(view, spot.line)) ?? region
}

/**
 * Brings a spot into view before it is measured. A Script line goes through CodeMirror, which
 * owns its scroller; any other region scrolls the page only as far as needed.
 */
export function revealDriveTarget(spot: DriveSpot, reduced: boolean): void {
  const region = regionOf(spot)
  if (!region) return
  const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth'
  if (spot.target === 'source' && spot.line !== undefined) {
    const view = editorIn(region)
    if (view && spot.line >= 1 && spot.line <= view.state.doc.lines) {
      const pos = view.state.doc.line(spot.line).from
      view.dispatch({ effects: EditorView.scrollIntoView(pos, { y: 'nearest', yMargin: 24 }) })
    }
  }
  driveTargetElement(spot)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior })
}

/** The spot's box in the viewport, or null when it is not on the page (another view or tab). */
export function measureDriveTarget(spot: DriveSpot): DriveRect | null {
  const el = driveTargetElement(spot)
  if (!el) return null
  const { left, top, width, height } = el.getBoundingClientRect()
  return width > 0 && height > 0 ? { left, top, width, height } : null
}
