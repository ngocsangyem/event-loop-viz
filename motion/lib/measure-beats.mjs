// Measures the beat grid from the mixed score: detects kick onsets in the low band, then fits
// tempo and phase by least squares so picture cues sit on the beats you actually hear.
import { execFileSync } from 'node:child_process'
import { BEATS } from '../film/cues.js'

const RATE = 8000
const HOP = 40 // 5 ms frames

export function measureBeats(wavPath) {
  const pcm = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', wavPath, '-ac', '1', '-ar', String(RATE), '-af', 'lowpass=f=120,lowpass=f=120', '-f', 'f32le', '-'], {
    maxBuffer: 1 << 28,
  })
  const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4)

  // Low-band energy envelope, then positive flux.
  const env = []
  for (let i = 0; i + HOP <= x.length; i += HOP) {
    let e = 0
    for (let k = i; k < i + HOP; k++) e += x[k] * x[k]
    env.push(Math.sqrt(e / HOP))
  }
  const flux = env.map((e, i) => Math.max(0, e - (env[i - 1] ?? 0)))
  const peak = Math.max(...flux)

  // Peak-pick with a 200 ms refractory window.
  const onsets = []
  let last = -1e9
  for (let i = 1; i < flux.length - 1; i++) {
    const t = (i * HOP) / RATE
    if (flux[i] > peak * 0.25 && flux[i] >= flux[i - 1] && flux[i] >= flux[i + 1] && t - last > 0.2) {
      onsets.push(t)
      last = t
    }
  }

  // Comb search over 90–160 BPM and phase: score = flux energy sitting on the grid lines.
  // This rejects off-beat bass notes, which would otherwise halve the measured period.
  const fps = RATE / HOP
  let best = { score: -1, period: 0, offset: 0 }
  for (let bpm = 90; bpm <= 160; bpm += 0.05) {
    const period = 60 / bpm
    for (let ph = 0; ph < period; ph += 1 / fps) {
      let score = 0
      for (let t = ph; t < x.length / RATE; t += period) score += flux[Math.round(t * fps)] ?? 0
      if (score > best.score) best = { score, period, offset: ph }
    }
  }
  // Least-squares refinement on the onsets within 40 ms of the comb grid.
  const pairs = onsets
    .map((t) => [Math.round((t - best.offset) / best.period), t])
    .filter(([k, t]) => Math.abs(t - (best.offset + k * best.period)) < 0.04)
  const n = pairs.length
  const sx = pairs.reduce((a, [k]) => a + k, 0)
  const sy = pairs.reduce((a, [, t]) => a + t, 0)
  const sxx = pairs.reduce((a, [k]) => a + k * k, 0)
  const sxy = pairs.reduce((a, [k, t]) => a + k * t, 0)
  const period = (n * sxy - sx * sy) / (n * sxx - sx * sx)
  // Detection lags the true transient by about one frame.
  const lag = HOP / RATE
  const offset = Math.max(0, (sy - period * sx) / n - lag)
  const residual = Math.sqrt(pairs.reduce((a, [k, t]) => a + (t - lag - (offset + k * period)) ** 2, 0) / n)

  return {
    bpm: 60 / period,
    offset,
    period,
    residualMs: residual * 1000,
    beats: Array.from({ length: BEATS }, (_, k) => +(offset + k * period).toFixed(5)),
    onsets: pairs.map(([, t]) => +t.toFixed(4)),
  }
}
