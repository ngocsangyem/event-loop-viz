// Narration clips: one cached MP3 per (voice settings, text), from OpenAI gpt-4o-mini-tts.
// edge-tts stays available (provider 'edge') for drafts without a key.
import { createHash } from 'node:crypto'
import { existsSync, renameSync, rmSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { LESSONS_OUT, REPO_ROOT } from './lesson-paths.mjs'
import { openaiSpeech } from './openai-speech.mjs'

const run = promisify(execFile)
const EDGE_TTS = join(REPO_ROOT, 'motion/.venv/bin/edge-tts')
export const CACHE = join(LESSONS_OUT, '.voice-cache')
/** One calm teacher voice for both languages (OpenAI "coral"), so the vi and en videos sound like
 * the same person. A Vietnamese-only voice mispronounced the English terms the lessons keep
 * (Call Stack, Promise…); gpt-4o-mini-tts reads Vietnamese and switches to English for them. */
const VOICE = process.env.LESSON_VOICE ?? 'coral'
export const VI_INSTRUCTIONS =
  'Giọng một giáo viên lập trình người Việt giàu kinh nghiệm: ấm áp, bình tĩnh, rõ ràng, tốc độ vừa phải, ngắt nghỉ tự nhiên theo dấu câu. ' +
  'Đọc tiếng Việt chuẩn giọng miền Bắc. Các thuật ngữ và tên hàm tiếng Anh (Call Stack, Promise, Microtask Queue, setTimeout, console dot log, callback…) ' +
  'đọc bằng phát âm tiếng Anh chuẩn, liền mạch trong câu, không đánh vần.'
export const EN_INSTRUCTIONS =
  'An experienced, friendly programming teacher explaining to a beginner: warm, calm and clear, at a moderate, unhurried pace, ' +
  'with natural pauses at punctuation. Not salesy, not theatrical.'
export const VOICES = {
  vi: { provider: 'openai', model: 'gpt-4o-mini-tts', voice: VOICE, instructions: VI_INSTRUCTIONS },
  en: { provider: 'openai', model: 'gpt-4o-mini-tts', voice: VOICE, instructions: EN_INSTRUCTIONS },
}


export async function duration(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
  return Number(stdout.trim())
}

/** One clip per distinct (voice settings, text), cached across runs and lessons. */
export async function synthesizeWith(spec, text) {
  const key = createHash('sha1').update(`${JSON.stringify(spec)}|${text}`).digest('hex').slice(0, 16)
  const file = join(CACHE, `${key}.mp3`)
  // A clip from an interrupted run may be truncated: keep a cached clip only if it decodes.
  if (existsSync(file)) {
    try {
      return { file, seconds: await duration(file) }
    } catch {
      rmSync(file)
    }
  }
  const partial = `${file}.part`
  for (let attempt = 1; ; attempt++) {
    try {
      if (spec.provider === 'openai') await openaiSpeech(spec, text, partial)
      else await run(EDGE_TTS, ['--voice', spec.voice, `--rate=${spec.rate}`, '--text', text, '--write-media', partial], { timeout: 60_000 })
      // Single English terms ("then") are short, so only an empty clip counts as a failure.
      if ((await duration(partial)) < 0.1) throw new Error('empty clip')
      renameSync(partial, file)
      break
    } catch (error) {
      if (attempt >= 4) throw new Error(`tts failed for "${text.slice(0, 40)}…": ${error.message}`)
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt))
    }
  }
  return { file, seconds: await duration(file) }
}
