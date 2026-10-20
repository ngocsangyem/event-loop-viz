/**
 * Runtime description of the Trace schema (schemaVersion 1), kept in lockstep with the types in
 * trace-event.ts: the mapped type below fails to compile when an event kind or field is added,
 * removed or renamed without updating this table. A snapshot test pins the table itself, so any
 * shape change is a deliberate, versioned decision.
 */
import { TRACE_SCHEMA_VERSION } from './trace-event'
import type { TraceEventBody, TraceHeader } from './trace-event'

type Primitive = 'string' | 'number' | 'boolean'

export interface FieldSpec {
  type: Primitive | 'enum' | 'string-array' | 'object'
  /** Allowed values when `type` is 'enum'. */
  values?: readonly string[]
  /** Nested fields when `type` is 'object'. */
  fields?: Record<string, FieldSpec>
  optional?: true
}

const str: FieldSpec = { type: 'string' }
const num: FieldSpec = { type: 'number' }
const bool: FieldSpec = { type: 'boolean' }
const opt = (spec: FieldSpec): FieldSpec => ({ ...spec, optional: true })
const obj = (fields: Record<string, FieldSpec>): FieldSpec => ({ type: 'object', fields })
const oneOf = (...values: string[]): FieldSpec => ({ type: 'enum', values })

type EventOf<K extends string> = TraceEventBody extends infer B
  ? B extends { k: infer KK }
    ? K extends KK
      ? B
      : never
    : never
  : never
type EventKind = TraceEventBody['k']
type EventSchema = { [K in EventKind]: { [F in Exclude<keyof EventOf<K>, 'k'>]-?: FieldSpec } }

const frame = { frameId: str, label: str, builtin: bool }
const taskRef = { taskId: str }
const jobRef = { jobId: str }
const checkpoint = { reason: oneOf('task-end', 'script-end', 'callback-end') }
const timerRef = { tid: str }

export const TRACE_EVENT_SCHEMA: EventSchema = {
  'run:start': {},
  'run:halted': {
    reason: oneOf('natural', 'nodes', 'tasks', 'virtual-time', 'events'),
    limit: opt(num),
  },
  'task:queue': {
    taskId: str,
    source: oneOf('script', 'timer', 'port-message', 'dom-manipulation'),
    dueUs: opt(num),
  },
  'task:begin': taskRef,
  'task:end': taskRef,
  'checkpoint:begin': checkpoint,
  'checkpoint:end': checkpoint,
  'job:enqueue': {
    jobId: str,
    jobKind: oneOf('reaction', 'thenable', 'microtask'),
    pid: opt(str),
    outcome: opt(oneOf('fulfill', 'reject')),
  },
  'job:begin': jobRef,
  'job:end': jobRef,
  'frame:push': frame,
  'frame:pop': frame,
  'timer:init': { tid: str, requestedMs: num, clampedMs: num, nesting: num, repeat: bool },
  'timer:fire': timerRef,
  'timer:clear': timerRef,
  'promise:create': { pid: str },
  'promise:reaction': {
    pid: str,
    via: oneOf('then', 'await', 'asyncgen', 'from-sync'),
    pending: bool,
  },
  'promise:resolve': { pid: str, with: oneOf('value', 'thenable', 'self') },
  'promise:settle': { pid: str, state: oneOf('fulfilled', 'rejected') },
  'await:suspend': { fid: str, awaitedPid: opt(str), mode: opt(oneOf('next', 'throw')) },
  'await:resume': { fid: str, awaitedPid: opt(str), mode: opt(oneOf('next', 'throw')) },
  'asyncgen:yield': { gid: str },
  'asyncgen:resume': { gid: str },
  'asyncgen:return-await': { gid: str },
  'rejection:track': { pid: str, op: oneOf('reject', 'handle') },
  'rejection:notify': { pid: str, outcome: oneOf('unhandled', 'handled'), message: str },
  'exception:report': {
    origin: oneOf('script', 'task-callback', 'microtask-callback'),
    message: str,
    unsupportedApi: opt(str),
  },
  console: { level: oneOf('log', 'info', 'warn', 'error'), text: str },
}

/** Fields every event carries, besides its kind. */
const EVENT_BASE_SCHEMA: Record<string, FieldSpec> = {
  seq: num,
  t: num,
  ref: str,
  loc: opt(obj({ start: num, end: num, line: num, column: num })),
  cause: opt(num),
  visible: bool,
}

const HEADER_SCHEMA: { [F in keyof TraceHeader]-?: FieldSpec } = {
  schemaVersion: num,
  engine: obj({ name: str, commit: str, patch: str }),
  hostProfile: oneOf('chrome-155'),
  budgets: obj({ nodes: num, tasks: num, virtualMs: num, events: num }),
  nodeCostUs: num,
  randomSeed: num,
  source: str,
  unsupportedApis: { type: 'string-array' },
  timingSensitive: bool,
}

function checkValue(path: string, value: unknown, spec: FieldSpec): string[] {
  switch (spec.type) {
    case 'string':
    case 'number':
    case 'boolean':
      return typeof value === spec.type ? [] : [`${path}: expected ${spec.type}`]
    case 'enum':
      return typeof value === 'string' && spec.values?.includes(value)
        ? []
        : [`${path}: expected one of ${spec.values?.join('|')}, got ${String(value)}`]
    case 'string-array':
      return Array.isArray(value) && value.every((v) => typeof v === 'string')
        ? []
        : [`${path}: expected string[]`]
    case 'object':
      return typeof value === 'object' && value !== null
        ? checkFields(path, value as Record<string, unknown>, spec.fields ?? {})
        : [`${path}: expected object`]
  }
}

function checkFields(
  where: string,
  record: Record<string, unknown>,
  schema: Record<string, FieldSpec>,
): string[] {
  const problems: string[] = []
  for (const [name, spec] of Object.entries(schema)) {
    const value = record[name]
    if (value === undefined) {
      if (!spec.optional) problems.push(`${where}.${name}: missing`)
    } else {
      problems.push(...checkValue(`${where}.${name}`, value, spec))
    }
  }
  for (const name of Object.keys(record)) {
    if (!(name in schema)) problems.push(`${where}.${name}: unknown field`)
  }
  return problems
}

/** Returns a list of problems; empty means the event conforms to schema v1. */
export function validateTraceEvent(event: unknown): string[] {
  if (typeof event !== 'object' || event === null) return ['event: expected object']
  const record = event as Record<string, unknown>
  const kind = record.k
  const where = `event(${String(kind)})`
  if (typeof kind !== 'string' || !Object.prototype.hasOwnProperty.call(TRACE_EVENT_SCHEMA, kind))
    return [`${where}: unknown kind`]
  const problems = checkFields(where, record, {
    ...EVENT_BASE_SCHEMA,
    k: str,
    ...TRACE_EVENT_SCHEMA[kind as EventKind],
  })
  if (typeof record.ref === 'string' && !/^(ES|HTML):/.test(record.ref)) {
    problems.push(`${where}.ref: expected an ES: or HTML: reference`)
  }
  return problems
}

export function validateTraceHeader(header: unknown): string[] {
  if (typeof header !== 'object' || header === null) return ['header: expected object']
  const record = header as Record<string, unknown>
  const problems = checkFields('header', record, HEADER_SCHEMA)
  if (record.schemaVersion !== TRACE_SCHEMA_VERSION)
    problems.push('header.schemaVersion: not the current version')
  return problems
}

/** Plain-data form of the whole schema; the snapshot test pins this. */
export function describeTraceSchema() {
  return {
    schemaVersion: TRACE_SCHEMA_VERSION,
    header: HEADER_SCHEMA,
    eventBase: EVENT_BASE_SCHEMA,
    events: TRACE_EVENT_SCHEMA,
  }
}
