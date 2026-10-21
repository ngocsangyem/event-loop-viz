import enCore from './en/core'
import enAi from './en/ai'
import enDiagram from './en/diagram'
import viCore from './vi/core'
import viAi from './vi/ai'
import viDiagram from './vi/diagram'

/** English is the source of truth: every other locale must have the same shape. */
export const en = { ...enCore, ai: enAi, diagram: enDiagram }
export type MessageSchema = typeof en

export const vi: MessageSchema = { ...viCore, ai: viAi, diagram: viDiagram }
