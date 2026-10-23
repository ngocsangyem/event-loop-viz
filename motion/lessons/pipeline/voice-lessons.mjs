// Step 2 of the lesson pipeline: one voice clip per beat (see speech-clips.mjs), measured and laid
// out on time → timing.<lang>.json + narration.<lang>.wav. Picture time is derived from voice
// time, so a beat can never end before its sentence does.
//   node motion/lessons/pipeline/voice-lessons.mjs [example-id ...] [--lang=vi|en]
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { LESSONS_OUT, lessonOutDir } from './lesson-paths.mjs'
import { layOutBeats } from './lay-out-beats.mjs'
import { CACHE, VOICES, synthesizeWith } from './speech-clips.mjs'

const run = promisify(execFile)
/** Clips synthesized at once (the TTS services are slow per request, not per byte). */
const PARALLEL = 6

const args = process.argv.slice(2)
const langs = (args.find((a) => a.startsWith('--lang='))?.slice(7) ?? 'vi,en').split(',')
const ids = args.filter((a) => !a.startsWith('--'))

/** Runs `task` over `items` with at most `limit` in flight, keeping order. */
async function mapLimit(items, limit, task) {
  const results = Array.from({ length: items.length })
  let next = 0
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await task(items[i], i)
    }
  }))
  return results
}

/** Places every clip at its beat's speech time on one mono 48 kHz track. */
async function mixNarration(clips, timing, out) {
  const inputs = clips.flatMap((clip) => ['-i', clip.file])
  const delays = clips.map((_, i) => `[${i}:a]aresample=48000,adelay=${Math.round(timing.beats[i].speech * 1000)}:all=1[a${i}]`)
  const mix = `${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,apad=whole_dur=${timing.duration}[out]`
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', [...delays, mix].join(';'), '-map', '[out]', '-ac', '1', '-ar', '48000', '-t', String(timing.duration), out], { maxBuffer: 1 << 24 })
}

mkdirSync(CACHE, { recursive: true })
const targets = ids.length ? ids : readdirSync(LESSONS_OUT).filter((d) => existsSync(join(LESSONS_OUT, d, 'plan.en.json')))
for (const id of targets) {
  for (const lang of langs) {
    const plan = JSON.parse(readFileSync(join(lessonOutDir(id), `plan.${lang}.json`), 'utf8'))
    const clips = await mapLimit(plan.beats, PARALLEL, (beat) => synthesizeWith(VOICES[lang], beat.say))
    const timing = layOutBeats(plan, clips.map((c) => c.seconds))
    writeFileSync(join(lessonOutDir(id), `timing.${lang}.json`), JSON.stringify(timing, null, 1))
    await mixNarration(clips, timing, join(lessonOutDir(id), `narration.${lang}.wav`))
    console.log(`${id} ${lang}: ${clips.length} clips, ${timing.duration.toFixed(1)} s`)
  }
}
