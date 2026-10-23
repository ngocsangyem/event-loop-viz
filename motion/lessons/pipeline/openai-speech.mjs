// OpenAI text-to-speech (gpt-4o-mini-tts) for the Vietnamese narration. One voice reads
// Vietnamese naturally and switches to English pronunciation for the JavaScript terms inside a
// sentence (Call Stack, Promise, setTimeout…), which a Vietnamese-only voice cannot do.
// The key comes from OPENAI_API_KEY in the environment or in .env.local (never printed).
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT } from './lesson-paths.mjs'

const ENDPOINT = 'https://api.openai.com/v1/audio/speech'

/** Reads OPENAI_API_KEY from the environment, else from .env.local / .env at the repo root. */
function apiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  for (const name of ['.env.local', '.env']) {
    const file = join(REPO_ROOT, name)
    if (!existsSync(file)) continue
    const line = readFileSync(file, 'utf8').split('\n').find((l) => /^\s*OPENAI_API_KEY\s*=/.test(l))
    if (line) return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
  }
  throw new Error('OPENAI_API_KEY is not set (add it to .env.local)')
}

/** Writes the spoken `text` to `file` (MP3). Throws with the service's message on failure. */
export async function openaiSpeech({ model, voice, instructions, speed }, text, file) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, voice, input: text, instructions, response_format: 'mp3', ...(speed && { speed }) }),
    signal: AbortSignal.timeout(90_000),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`OpenAI TTS ${response.status}: ${detail.slice(0, 200)}`)
  }
  writeFileSync(file, Buffer.from(await response.arrayBuffer()))
}
