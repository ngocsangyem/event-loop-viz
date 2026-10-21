import type { NodeId } from './diagram-flow'

/** Glyphs for the card badges, drawn as strokes in a 24 by 24 box. */
export const NODE_ICON: Record<NodeId, string> = {
  stack: 'M5 6h14M5 12h14M5 18h14',
  webapis: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2',
  taskq: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  microq: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  loop: 'M21 12a9 9 0 0 0-15-6.7L3 8M3 3v5h5M3 12a9 9 0 0 0 15 6.7L21 16M16 16h5v5',
  console: 'M4 17l6-6-6-6M12 19h8',
}
