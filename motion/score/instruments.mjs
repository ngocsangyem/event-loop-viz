// Synth voices for the score. Each voice renders one hit into a bus at absolute time t0.
import { SR, write, mulberry32, midiToHz, polyBlepSaw, createSvf } from './dsp-primitives.mjs'

const rand = mulberry32(0x5eed)
const noise = () => rand() * 2 - 1

export function kick(bus, t0, amp = 1, { punch = 1 } = {}) {
  let phase = 0
  write(bus, t0, 0.5, (i, t) => {
    const f = 46 + 150 * punch * Math.exp(-t * 32)
    phase += f / SR
    const body = Math.sin(2 * Math.PI * phase) * Math.exp(-t * 7.5)
    const click = t < 0.004 ? noise() * (1 - t / 0.004) * 0.6 : 0
    return Math.tanh((body + click) * 1.6)
  }, amp * 0.9)
}

export function clap(bus, t0, amp = 1, pan = 0) {
  const svf = createSvf()
  write(bus, t0, 0.35, (i, t) => {
    const bursts = [0, 0.009, 0.018].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * (o < 0.018 ? 140 : 17)) : 0), 0)
    return svf(noise(), 1500, 1.4).bp * bursts * 1.7
  }, amp * 0.55, pan)
}

export function hat(bus, t0, amp = 1, open = false, pan = 0.25) {
  const svf = createSvf()
  write(bus, t0, open ? 0.25 : 0.06, (i, t) => svf(noise(), 9000, 0.8).hp * Math.exp(-t * (open ? 16 : 75)), amp * 0.2, pan)
}

export function bass(bus, t0, dur, midi, amp = 1) {
  const hz = midiToHz(midi)
  const svf = createSvf()
  let p = 0
  let s = 0
  write(bus, t0, dur, (i, t) => {
    p = (p + hz / SR) % 1
    s += hz / SR
    const saw = polyBlepSaw(p, hz / SR)
    const sub = Math.sin(2 * Math.PI * s)
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 4) * (t > dur - 0.01 ? (dur - t) / 0.01 : 1)
    return (svf(saw, 300 + 1600 * Math.exp(-t * 18), 1.2).lp * 0.7 + sub * 0.8) * env
  }, amp * 0.5)
}

// Detuned-saw chord stab with a filter snap; `decay` sets the tail length.
export function stab(bus, t0, notes, amp = 1, { decay = 5, cutoff = 4200, dur = 0.9, pan = 0 } = {}) {
  const voices = notes.flatMap((m) => [-0.12, 0.12].map((d) => ({ hz: midiToHz(m + d), p: rand() })))
  const svf = createSvf()
  write(bus, t0, dur, (i, t) => {
    let v = 0
    for (const o of voices) {
      o.p = (o.p + o.hz / SR) % 1
      v += polyBlepSaw(o.p, o.hz / SR)
    }
    v /= voices.length
    const env = Math.min(1, t / 0.003) * Math.exp(-t * decay)
    return svf(v, 300 + cutoff * Math.exp(-t * 9), 1.1).lp * env * 1.6
  }, amp * 0.5, pan)
}

export function pad(bus, t0, dur, notes, amp = 1) {
  const voices = notes.flatMap((m) => [-0.08, 0, 0.09].map((d) => ({ hz: midiToHz(m + d), p: rand() })))
  const svf = createSvf()
  write(bus, t0, dur, (i, t) => {
    let v = 0
    for (const o of voices) {
      o.p = (o.p + o.hz / SR) % 1
      v += polyBlepSaw(o.p, o.hz / SR)
    }
    const env = Math.min(1, t / 0.02) * Math.min(1, (dur - t) / 0.6)
    return svf(v / voices.length, 900 + 500 * Math.sin(t * 2.1), 0.9).lp * env
  }, amp * 0.45)
}

// Pitched UI blip: concept hues map to registers (stack low, task mid, job high, console bright).
export function blip(bus, t0, midi, amp = 1, pan = 0, decay = 22) {
  const hz = midiToHz(midi)
  let p = 0
  write(bus, t0, 0.3, (i, t) => {
    p += hz / SR
    const tri = 1 - 4 * Math.abs((p % 1) - 0.5)
    return (tri * 0.7 + Math.sin(2 * Math.PI * p * 2) * 0.3) * Math.min(1, t / 0.002) * Math.exp(-t * decay)
  }, amp * 0.32, pan)
}

export function tick(bus, t0, amp = 1, pan = 0) {
  const svf = createSvf()
  write(bus, t0, 0.03, (i, t) => svf(noise(), 6000, 3).bp * Math.exp(-t * 260), amp * 0.5, pan)
}

// Filtered-noise swoosh for camera moves; `up` sweeps low→high, otherwise high→low.
export function whoosh(bus, t0, dur, amp = 1, { up = true, from = -0.6, to = 0.6 } = {}) {
  const svf = createSvf()
  const n = Math.round(dur * SR)
  for (let k = 0; k < 8; k++) {
    // Pan is automated in 8 slices so the swoosh travels across the stereo field.
    const s0 = (k / 8) * dur
    const pan = from + ((to - from) * k) / 7
    write(bus, t0 + s0, dur / 8, (i, tl) => {
      const x = (s0 + tl) / dur
      const cut = up ? 300 * Math.pow(30, x) : 9000 * Math.pow(1 / 30, x)
      const env = Math.sin(Math.PI * Math.min(1, x)) ** 1.5
      return svf(noise(), cut, 2.2).bp * env * 1.4
    }, amp * 0.45, pan)
  }
  return n
}

export function riser(bus, t0, dur, amp = 1) {
  const svf = createSvf()
  let p = 0
  write(bus, t0, dur, (i, t) => {
    const x = t / dur
    p += (110 * Math.pow(8, x)) / SR
    const tone = Math.sin(2 * Math.PI * p) * 0.25 * x
    return (svf(noise(), 400 * Math.pow(25, x), 3).bp * 1.2 + tone) * x * x
  }, amp * 0.5)
}

// Downbeat impact: sub boom + crack + long air tail.
export function impact(bus, t0, amp = 1) {
  kick(bus, t0, amp * 1.1, { punch: 1.4 })
  let p = 0
  const svf = createSvf()
  write(bus, t0, 2.2, (i, t) => {
    p += (38 + 20 * Math.exp(-t * 6)) / SR
    const sub = Math.sin(2 * Math.PI * p) * Math.exp(-t * 1.6)
    const air = svf(noise(), 5000, 0.6).hp * Math.exp(-t * 3.2) * 0.35
    const crack = t < 0.03 ? noise() * (1 - t / 0.03) : 0
    return sub * 0.8 + air + crack * 0.6
  }, amp * 0.6)
}
