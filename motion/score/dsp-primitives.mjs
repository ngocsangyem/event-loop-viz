// Small offline DSP kit for the synthesized score. Everything writes into stereo Float32Array
// buffers at a fixed sample rate; noise is seeded (mulberry32) so every render is identical.

export const SR = 48000

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createBus(seconds) {
  const n = Math.ceil(seconds * SR)
  return { L: new Float32Array(n), R: new Float32Array(n) }
}

// Equal-power pan, p in [-1, 1].
export function panGains(p) {
  const a = ((p + 1) * Math.PI) / 4
  return [Math.cos(a), Math.sin(a)]
}

// Renders `fn(i, tLocal)` (mono sample) for `dur` seconds starting at `t0` into a bus.
export function write(bus, t0, dur, fn, gain = 1, pan = 0) {
  const start = Math.max(0, Math.round(t0 * SR))
  const end = Math.min(bus.L.length, Math.round((t0 + dur) * SR))
  const [gl, gr] = panGains(pan)
  for (let i = start; i < end; i++) {
    const v = fn(i - start, (i - start) / SR) * gain
    bus.L[i] += v * gl
    bus.R[i] += v * gr
  }
}

export function midiToHz(m) {
  return 440 * Math.pow(2, (m - 69) / 12)
}

// Naive band-limited-enough saw via polyBLEP, phase in [0,1).
export function polyBlepSaw(phase, dt) {
  let v = 2 * phase - 1
  if (phase < dt) {
    const x = phase / dt
    v -= x + x - x * x - 1
  } else if (phase > 1 - dt) {
    const x = (phase - 1) / dt
    v -= x * x + x + x + 1
  }
  return v
}

// Chamberlin state-variable filter; returns {lp, bp, hp} per call.
export function createSvf() {
  let low = 0
  let band = 0
  return (x, cutoffHz, q = 0.7) => {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoffHz, SR / 6)) / SR)
    const damp = 1 / q
    low += f * band
    const high = x - low - damp * band
    band += f * high
    return { lp: low, bp: band, hp: high }
  }
}

// Schroeder-style stereo reverb (4 combs + 2 allpasses per side), applied to a send bus.
export function reverbInto(send, out, { size = 0.82, damp = 0.35, mix = 1 } = {}) {
  const combsL = [1557, 1617, 1491, 1422]
  const combsR = combsL.map((d) => d + 23)
  const aps = [556, 441]
  for (const [src, dst, combLens] of [
    [send.L, out.L, combsL],
    [send.R, out.R, combsR],
  ]) {
    const combs = combLens.map((len) => ({ buf: new Float32Array(len), i: 0, lp: 0 }))
    const allp = aps.map((len) => ({ buf: new Float32Array(len), i: 0 }))
    for (let n = 0; n < src.length; n++) {
      let acc = 0
      for (const c of combs) {
        const y = c.buf[c.i]
        c.lp = y * (1 - damp) + c.lp * damp
        c.buf[c.i] = src[n] * 0.015 + c.lp * size
        c.i = (c.i + 1) % c.buf.length
        acc += y
      }
      for (const a of allp) {
        const b = a.buf[a.i]
        a.buf[a.i] = acc + b * 0.5
        acc = b - acc
        a.i = (a.i + 1) % a.buf.length
      }
      dst[n] += acc * mix
    }
  }
}

// Sums `src` into `dst` with an optional per-sample gain curve (e.g. sidechain duck).
export function mixInto(dst, src, gain = 1, curve = null) {
  for (let i = 0; i < dst.L.length; i++) {
    const g = curve ? gain * curve[i] : gain
    dst.L[i] += src.L[i] * g
    dst.R[i] += src.R[i] * g
  }
}
