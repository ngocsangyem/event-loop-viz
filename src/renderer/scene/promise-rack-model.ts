import type { AsyncGenView, PromiseView, ReplayState } from '../../player/replay-state'

export interface PromiseRowModel {
  pid: string
  view: PromiseView
  /** The first async function parked on this promise, if any. */
  waiter: { fid: string; label: string } | null
  /** Further parked functions on the same promise, counted not drawn. */
  extraWaiters: number
}

export interface GeneratorModel {
  gid: string
  view: AsyncGenView
}

export interface PromiseRackModel {
  /** Promise rows in creation order, far to near on the rack. */
  rows: PromiseRowModel[]
  /** Promises that did not fit the rack. */
  hiddenPromises: number
  /** The most recent async generators, oldest first. */
  generators: GeneratorModel[]
}

export interface RackCapacity {
  rows: number
  generators: number
}

/** Numeric part of an id such as `p12`; ids without one sort last, by name. */
const serial = (id: string) => {
  const n = Number.parseInt(id.replace(/^\D+/, ''), 10)
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n
}
const byCreation = (a: string, b: string) => serial(a) - serial(b) || (a < b ? -1 : a > b ? 1 : 0)

/**
 * What the promise rack shows for one ReplayState: pure data, no geometry. Rows are kept in
 * this order of importance when the rack is full: promises with a function parked on them,
 * then pending and rejected ones (a rejection must not scroll away), then the newest fulfilled ones.
 */
export function promiseRackOf(state: ReplayState, capacity: RackCapacity): PromiseRackModel {
  const waitersOf = new Map<string, ReplayState['suspendedAwaits']>()
  for (const parked of state.suspendedAwaits) {
    if (parked.pid === undefined) continue
    waitersOf.set(parked.pid, [...(waitersOf.get(parked.pid) ?? []), parked])
  }
  // A promise the Trace never created (a wrapper) can still be awaited: draw it as pending.
  const ids = new Set([...Object.keys(state.promises), ...waitersOf.keys()])
  const view = (pid: string): PromiseView => state.promises[pid] ?? 'pending'
  const weight = (pid: string) => (waitersOf.has(pid) ? 2 : view(pid) === 'fulfilled' ? 0 : 1)

  const ranked = [...ids].sort((a, b) => weight(b) - weight(a) || byCreation(b, a))
  const shown = ranked.slice(0, capacity.rows).sort(byCreation)
  const rows = shown.map((pid): PromiseRowModel => {
    const waiters = waitersOf.get(pid) ?? []
    const first = waiters[0]
    return {
      pid,
      view: view(pid),
      waiter: first ? { fid: first.fid, label: first.label } : null,
      extraWaiters: Math.max(0, waiters.length - 1),
    }
  })

  const generators = Object.keys(state.asyncGens)
    .sort(byCreation)
    .slice(-capacity.generators)
    .map((gid): GeneratorModel => ({ gid, view: state.asyncGens[gid]! }))

  return { rows, hiddenPromises: ids.size - rows.length, generators }
}
