// Synthesizes the score, normalizes it to -14 LUFS and measures the beat grid into beats.json.
// Usage: node score.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { renderScore } from './score/arrangement.mjs'
import { SR } from './score/dsp-primitives.mjs'
import { measureBeats } from './lib/measure-beats.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'out')
mkdirSync(out, { recursive: true })

function writeFloatWav(path, { L, R }) {
  const n = L.length
  const buf = Buffer.alloc(44 + n * 8)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + n * 8, 4)
  buf.write('WAVEfmt ', 8)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(3, 20) // IEEE float
  buf.writeUInt16LE(2, 22)
  buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 8, 28)
  buf.writeUInt16LE(8, 32)
  buf.writeUInt16LE(32, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(n * 8, 40)
  for (let i = 0; i < n; i++) {
    buf.writeFloatLE(L[i], 44 + i * 8)
    buf.writeFloatLE(R[i], 48 + i * 8)
  }
  writeFileSync(path, buf)
}

const raw = join(out, 'score-raw.wav')
const final = join(out, 'score.wav')
console.log('synthesizing…')
writeFloatWav(raw, renderScore())

// Two-pass loudnorm: measure first, then apply linearly so the dynamics are not pumped.
// ffmpeg prints filter reports on stderr.
const stderrOf = (args) => spawnSync('ffmpeg', ['-hide_banner', ...args], { encoding: 'utf8' }).stderr
const probe = stderrOf(['-i', raw, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'])
const m = JSON.parse(probe.slice(probe.lastIndexOf('{'), probe.lastIndexOf('}') + 1))
const af = `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=${SR}`
execFileSync('ffmpeg', ['-hide_banner', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-c:a', 'pcm_s24le', final])

const check = stderrOf(['-i', final, '-af', 'ebur128=peak=true', '-f', 'null', '-'])
const lufs = check.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()
const peak = check.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()
console.log(`loudness ${lufs} · true ${peak}`)

const beats = measureBeats(final)
writeFileSync(join(here, 'beats.json'), JSON.stringify(beats, null, 2))
console.log(`beats.json · ${beats.bpm.toFixed(2)} BPM · phase ${beats.offset.toFixed(4)}s · ${beats.onsets.length} kick onsets`)
