// Voice audition: the same Vietnamese teaching lines in several OpenAI voices, so a person can
// pick one by ear before every lesson is voiced with it → plans/samples/vi-<voice>.mp3.
//   node motion/lessons/pipeline/voice-sample.mjs [voice ...]
// Then voice the lessons with the chosen one: LESSON_VOICE=<voice> node voice-lessons.mjs
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT } from './lesson-paths.mjs'
import { CACHE, VOICES, synthesizeWith } from './speech-clips.mjs'

const LINE =
  'Tiếp theo là Microtask Queue. Promise chấm resolve tạo ra một promise đã fulfilled sẵn, nên callback của chấm then vào thẳng Microtask Queue. ' +
  'Lệnh setTimeout không chạy callback ngay, mà giao nó cho Web APIs. Khi Call Stack trống, Event Loop chạy hết các microtask, rồi mới lấy Task tiếp theo.'

const voices = process.argv.slice(2).length ? process.argv.slice(2) : ['coral', 'sage', 'nova', 'shimmer', 'ash', 'ballad']
const out = join(REPO_ROOT, 'plans/samples')
mkdirSync(out, { recursive: true })
mkdirSync(CACHE, { recursive: true })
await Promise.all(
  voices.map(async (voice) => {
    const clip = await synthesizeWith({ ...VOICES.vi, voice }, LINE)
    copyFileSync(clip.file, join(out, `vi-${voice}.mp3`))
    console.log(`vi-${voice}.mp3 · ${clip.seconds.toFixed(1)} s`)
  }),
)
