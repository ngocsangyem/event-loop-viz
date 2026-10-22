// The 15 s cue: 8 bars at 128 BPM in E minor. Drums and SFX land on the same beat grid
// as the picture (cues.js), so each cut has its own hit.
import { createBus, mixInto, reverbInto, SR } from './dsp-primitives.mjs'
import * as v from './instruments.mjs'
import { BPM, DURATION, SECTIONS, RUN_EVENTS } from '../film/cues.js'

const B = 60 / BPM
const at = (beat) => beat * B

// One chord (MIDI notes) per bar; bass plays the first note an octave down.
const CHORDS = [
  [52, 55, 59, 64], // Em
  [52, 55, 59, 64], // Em
  [48, 52, 55, 60], // C
  [55, 59, 62, 67], // G
  [50, 54, 57, 62], // D
  [52, 55, 59, 66], // Em(add9)
  [48, 52, 55, 62], // Cadd9
  [52, 59, 62, 66], // Em9 for the lock-up
]

const inSection = (beat, [a, b]) => beat >= a && beat < b

export function renderScore() {
  const drums = createBus(DURATION)
  const music = createBus(DURATION)
  const sfx = createBus(DURATION)
  const send = createBus(DURATION)
  const kicks = []
  const kickAt = (beat, amp = 1) => {
    v.kick(drums, at(beat), amp)
    kicks.push(at(beat))
  }

  // Hook: impact on frame 0, two stabs as the two lines slam in, a roll into the dive.
  v.impact(drums, 0, 1)
  kicks.push(0)
  v.stab(music, 0, CHORDS[0].map((n) => n + 12), 0.9, { decay: 3 })
  v.stab(send, 0, CHORDS[0].map((n) => n + 12), 0.5, { decay: 3 })
  for (const b of [1, 2]) {
    kickAt(b, 0.9)
    v.stab(music, at(b), CHORDS[b === 1 ? 2 : 3].map((n) => n + 12), 0.8, { decay: 7, dur: 0.5 })
    v.stab(send, at(b), CHORDS[b === 1 ? 2 : 3].map((n) => n + 12), 0.4, { decay: 7, dur: 0.5 })
  }
  for (let k = 0; k < 8; k++) v.clap(drums, at(3 + k / 8), 0.25 + k * 0.08, k % 2 ? 0.3 : -0.3)
  v.whoosh(sfx, at(3), B, 1.1, { up: true, from: 0, to: 0 })

  // Groove: four-on-the-floor from the loop section until the gap before the lock-up.
  for (let b = 4; b < 28; b++) {
    const gap = b === 27 // drums drop out on the last rule beat so the lock-up lands harder
    if (!gap) kickAt(b)
    if (b % 2 === 1 && b >= 7 && !gap) {
      v.clap(drums, at(b), 0.9)
      v.clap(send, at(b), 0.6)
    }
    for (let s = 0; s < 4; s++) {
      if (gap || b < 6) continue
      const offbeat = s === 2
      v.hat(drums, at(b + s / 4), offbeat ? 0.9 : 0.35, offbeat && b % 4 === 3, s % 2 ? 0.35 : -0.2)
    }
    if (!gap) v.bass(music, at(b + 0.5), B * 0.45, CHORDS[Math.floor(b / 4)][0] - 12, 1)
  }

  // Loop section: the orange block breaks off (b5), the title lands (b6), the grid explodes (b7).
  v.tick(sfx, at(5), 1.2, 0.4)
  v.blip(sfx, at(5), 88, 0.8, 0.4, 14)
  v.stab(music, at(6), CHORDS[1], 0.8, { decay: 4 })
  v.whoosh(sfx, at(7) - B * 0.4, B * 0.5, 0.9, { up: true })

  // Run section: one pitched blip per Trace step. Stack low, task mid, job high, console bright.
  const PITCH = { push: 52, 'enqueue-task': 64, 'enqueue-job': 76, 'job-to-stack': 76, 'task-to-stack': 64, log: 83 }
  for (const e of RUN_EVENTS) {
    const t = at(e.beat)
    if (PITCH[e.kind]) v.blip(sfx, t, PITCH[e.kind], 1, e.kind.includes('job') ? 0.35 : -0.25)
    if (PITCH[e.kind]) v.blip(send, t, PITCH[e.kind], 0.5)
    if (e.kind.startsWith('enqueue') || e.kind.endsWith('to-stack')) v.whoosh(sfx, t - 0.06, 0.3, 0.5, { from: -0.5, to: 0.5 })
    if (e.kind === 'push') v.blip(sfx, t + B / 2, 83, 0.6, 0.2) // console line prints half a beat later
    if (e.kind === 'script-done') v.stab(music, t, CHORDS[3], 0.6, { decay: 6, dur: 0.6 })
    if (e.kind === 'tick') v.whoosh(sfx, t - 0.1, B, 1, { up: true, from: -0.9, to: 0.9 })
  }

  // Reorder: each line flies to its run slot with a rising pluck; a stab closes the phrase.
  v.stab(music, at(18), CHORDS[4].map((n) => n + 12), 0.7, { decay: 5 })
  ;[64, 67, 71, 76].forEach((m, k) => {
    v.blip(sfx, at(19 + k), m + 12, 0.9, k % 2 ? 0.4 : -0.4, 9)
    v.blip(send, at(19 + k), m + 12, 0.6)
    v.whoosh(sfx, at(19 + k) - 0.12, 0.32, 0.55, { from: -0.4, to: 0.4 })
  })
  v.stab(music, at(23), CHORDS[5].map((n) => n + 12), 0.8, { decay: 3 })
  v.stab(send, at(23), CHORDS[5].map((n) => n + 12), 0.5, { decay: 3 })

  // Rule: one stab per word, riser into the gap.
  for (const b of [24, 25, 26]) v.stab(music, at(b), CHORDS[6].map((n) => n + 12 + (b - 24) * 2), 0.75, { decay: 8, dur: 0.45 })
  v.riser(sfx, at(25.5), B * 2.25, 1)
  for (let k = 0; k < 4; k++) v.tick(sfx, at(27 + k / 4), 0.9, k % 2 ? 0.5 : -0.5)

  // Lock-up: impact on the downbeat, pad under the wordmark, typing ticks, one last "now" blip.
  v.impact(drums, at(28), 1.1)
  kicks.push(at(28))
  v.pad(music, at(28), DURATION - at(28), CHORDS[7], 1)
  v.stab(music, at(28), CHORDS[7].map((n) => n + 12), 0.9, { decay: 2, dur: 1.6 })
  v.stab(send, at(28), CHORDS[7].map((n) => n + 12), 0.8, { decay: 2, dur: 1.6 })
  for (let k = 0; k < 10; k++) v.tick(sfx, at(29) + k * 0.035, 0.5, -0.3 + k * 0.06)
  v.tick(sfx, at(30), 0.9)
  v.blip(sfx, at(31), 88, 0.9, 0, 10)
  v.blip(send, at(31), 88, 0.7, 0, 10)

  return mixdown({ drums, music, sfx, send, kicks, inHook: (b) => inSection(b, SECTIONS.hook) })
}

function mixdown({ drums, music, sfx, send, kicks }) {
  const n = drums.L.length
  // Sidechain: music ducks under every kick so the low end stays clean.
  const duck = new Float32Array(n).fill(1)
  for (const k of kicks) {
    const s = Math.round(k * SR)
    for (let i = s; i < Math.min(n, s + SR * 0.3); i++) duck[i] = Math.min(duck[i], 1 - 0.65 * Math.exp(-((i - s) / SR) * 11))
  }
  const master = createBus(DURATION)
  mixInto(master, drums, 1)
  mixInto(master, music, 0.8, duck)
  mixInto(master, sfx, 0.9)
  reverbInto(send, master, { size: 0.84, damp: 0.4, mix: 0.9 })
  for (let i = 0; i < n; i++) {
    master.L[i] = Math.tanh(master.L[i] * 1.2) * 0.9
    master.R[i] = Math.tanh(master.R[i] * 1.2) * 0.9
  }
  return master
}
