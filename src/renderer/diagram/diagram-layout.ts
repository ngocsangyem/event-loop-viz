import type { EdgeId, NodeId } from './diagram-flow'
import type { Capacity } from './diagram-model'
import type { Point, Rect } from './diagram-geometry'

/** Height of a card's title band, and of one row below it. Shared by both layouts. */
export const HEADER_HEIGHT = 36
export const ROW_HEIGHT = 30

export interface EdgeLayout {
  /** Orthogonal waypoints from the source card's border to the target card's border. */
  points: Point[]
  /** Where the caption sits, and how it hangs off that point. */
  label: { x: number; y: number; anchor: 'start' | 'middle' | 'end'; vertical?: boolean }
}

export interface DiagramLayout {
  id: 'wide' | 'narrow'
  width: number
  height: number
  nodes: Record<NodeId, Rect>
  edges: Record<EdgeId, EdgeLayout>
  capacity: Capacity
}

const P = (x: number, y: number): Point => ({ x, y })

/** The classic picture: Call Stack centre-left, Web APIs top-right, queues below and right. */
export const WIDE_LAYOUT: DiagramLayout = {
  id: 'wide',
  width: 960,
  height: 620,
  capacity: { stack: 5, webapis: 3, taskq: 3, microq: 3, console: 3 },
  nodes: {
    stack: { x: 30, y: 80, w: 240, h: 300 },
    console: { x: 30, y: 440, w: 240, h: 160 },
    loop: { x: 340, y: 170, w: 240, h: 140 },
    microq: { x: 340, y: 440, w: 240, h: 160 },
    webapis: { x: 680, y: 40, w: 250, h: 170 },
    taskq: { x: 680, y: 430, w: 250, h: 170 },
  },
  edges: {
    register: { points: [P(270, 120), P(680, 120)], label: { x: 475, y: 110, anchor: 'middle' } },
    'timer-fires': { points: [P(805, 210), P(805, 430)], label: { x: 822, y: 324, anchor: 'start' } },
    'next-task': {
      points: [P(680, 515), P(630, 515), P(630, 240), P(580, 240)],
      label: { x: 612, y: 400, anchor: 'end' },
    },
    'run-task': { points: [P(340, 240), P(270, 240)], label: { x: 305, y: 230, anchor: 'middle' } },
    'queue-job': {
      points: [P(270, 360), P(300, 360), P(300, 520), P(340, 520)],
      label: { x: 314, y: 428, anchor: 'start' },
    },
    'run-job': {
      points: [P(420, 440), P(420, 335), P(270, 335)],
      label: { x: 345, y: 358, anchor: 'middle' },
    },
    log: { points: [P(110, 380), P(110, 440)], label: { x: 120, y: 415, anchor: 'start' } },
  },
}

/** One column for phones: cards top to bottom, the long connectors in the side gutters. */
export const NARROW_LAYOUT: DiagramLayout = {
  id: 'narrow',
  width: 360,
  height: 1022,
  capacity: { stack: 4, webapis: 2, taskq: 2, microq: 2, console: 2 },
  nodes: {
    webapis: { x: 40, y: 10, w: 262, h: 126 },
    taskq: { x: 40, y: 176, w: 262, h: 126 },
    loop: { x: 40, y: 342, w: 262, h: 112 },
    stack: { x: 40, y: 494, w: 262, h: 186 },
    microq: { x: 40, y: 720, w: 262, h: 126 },
    console: { x: 40, y: 886, w: 262, h: 126 },
  },
  edges: {
    register: {
      points: [P(302, 540), P(322, 540), P(322, 60), P(302, 60)],
      label: { x: 340, y: 300, anchor: 'middle', vertical: true },
    },
    'timer-fires': { points: [P(130, 136), P(130, 176)], label: { x: 142, y: 161, anchor: 'start' } },
    'next-task': { points: [P(130, 302), P(130, 342)], label: { x: 142, y: 327, anchor: 'start' } },
    'run-task': { points: [P(130, 454), P(130, 494)], label: { x: 142, y: 479, anchor: 'start' } },
    'queue-job': { points: [P(90, 680), P(90, 720)], label: { x: 102, y: 705, anchor: 'start' } },
    'run-job': { points: [P(220, 720), P(220, 680)], label: { x: 232, y: 705, anchor: 'start' } },
    log: {
      points: [P(40, 600), P(20, 600), P(20, 943), P(40, 943)],
      label: { x: 8, y: 832, anchor: 'middle', vertical: true },
    },
  },
}

/** Container width, in px, below which the vertical layout is used. */
export const NARROW_BELOW = 640

export const layoutFor = (containerWidth: number): DiagramLayout =>
  containerWidth > 0 && containerWidth < NARROW_BELOW ? NARROW_LAYOUT : WIDE_LAYOUT
