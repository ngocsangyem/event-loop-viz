// Time and easing helpers. Everything here is a pure function of t; nothing remembers a frame.

export const clamp01 = (x) => Math.min(1, Math.max(0, x))
export const lerp = (a, b, x) => a + (b - a) * x
export const mix = (a, b, x) => a.map((v, i) => lerp(v, b[i], x))

export const ease = {
  linear: (x) => x,
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  inOutExpo: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inCubic: (x) => x * x * x,
  outQuart: (x) => 1 - Math.pow(1 - x, 4),
  inQuart: (x) => x * x * x * x,
  // Swift: the app's --ease-swift feel, fast start and a long settle.
  swift: (x) => 1 - Math.pow(1 - x, 5),
}

// Closed-form damped spring from 0 to 1. `s` is seconds since release.
export function spring(s, { freq = 3.2, damp = 0.42 } = {}) {
  if (s <= 0) return 0
  const w = 2 * Math.PI * freq
  const wd = w * Math.sqrt(1 - damp * damp)
  return 1 - Math.exp(-damp * w * s) * (Math.cos(wd * s) + ((damp * w) / wd) * Math.sin(wd * s))
}

// Beat clock over the measured grid. Fractional beats interpolate along the fitted period.
export function createClock(grid) {
  const { offset, period } = grid
  // The measured grid is a linear fit, so beat n sits at offset + n * period.
  const b = (n) => offset + n * period
  return {
    period,
    b,
    // Seconds since beat n (negative before it).
    since: (t, n) => t - b(n),
    // Eased 0→1 progress over `dur` seconds starting at beat n (plus optional offset in seconds).
    prog: (t, n, dur, fn = ease.outExpo, offset = 0) => fn(clamp01((t - b(n) - offset) / dur)),
    // Progress of a move that lands exactly on beat n, starting `lead` seconds before it.
    land: (t, n, lead, fn = ease.inOutExpo) => fn(clamp01((t - (b(n) - lead)) / lead)),
    // Beat index (fractional) at time t.
    beatAt: (t) => (t - offset) / period,
  }
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let r = a
    r = Math.imul(r ^ (r >>> 15), r | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// Decaying camera shake after an impact at time t0. Seeded per impact so it is repeatable.
export function shake(t, t0, amp = 14, decay = 9, seed = 7) {
  const s = t - t0
  if (s < 0 || s > 0.6) return [0, 0]
  const k = Math.floor(s * 60)
  const r = mulberry32(seed * 1000 + k)
  const d = amp * Math.exp(-s * decay)
  return [(r() * 2 - 1) * d, (r() * 2 - 1) * d]
}
