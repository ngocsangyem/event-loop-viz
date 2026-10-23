// Where each pipeline step reads and writes. Intermediate files live in motion/lessons/out
// (gitignored); finished videos go to public/videos/event-loop/<example-id>/<lang>.mp4.
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))
export const LESSONS_OUT = join(REPO_ROOT, 'motion/lessons/out')
export const VIDEOS_DIR = join(REPO_ROOT, 'public/videos/event-loop')

export const lessonOutDir = (id) => join(LESSONS_OUT, id)
export const voiceDir = (id, lang) => join(LESSONS_OUT, id, `voice-${lang}`)
export const videoPath = (id, lang) => join(VIDEOS_DIR, id, `${lang}.mp4`)
