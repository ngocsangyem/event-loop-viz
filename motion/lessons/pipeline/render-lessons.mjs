// Step 3 of the lesson pipeline: paint the film through window.seek(t) in headless Chromium and
// encode MP4 (H.264 High, yuv420p, 1920×1080, 30 fps, AAC voice at -14 LUFS, faststart).
//   node render-lessons.mjs <id> [--lang=vi,en]            full render → public/videos/event-loop/<id>/<lang>.mp4
//   node render-lessons.mjs <id> --lang=en --contact       one frame per beat → out/<id>/contact-<lang>.png
//   node render-lessons.mjs <id> --lang=en --at=3.5,40     single frames → out/<id>/frames/
// The timeline is cut into chunks rendered in parallel, each encoded with the final settings so
// the chunks join without re-encoding.
import { chromium } from '@playwright/test'
import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createServer } from 'vite'
import { REPO_ROOT, lessonOutDir, videoPath } from './lesson-paths.mjs'
import { encodeArgs, mixAudio } from './encode-settings.mjs'
import { writeVideoManifest } from './write-video-manifest.mjs'

const FPS = 30
const argv = process.argv.slice(2)
const opt = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')).map(([k, v]) => [k, v ?? true]))
const ids = argv.filter((a) => !a.startsWith('--'))
const langs = String(opt.lang ?? 'vi,en').split(',')
const WORKERS = Number(opt.workers ?? 6)

async function startServer() {
  process.env.ELV_E2E = '1'
  const server = await createServer({ root: REPO_ROOT, configFile: join(REPO_ROOT, 'vite.config.ts'), logLevel: 'error', server: { port: 0, hmr: false } })
  await server.listen()
  const { port } = server.httpServer.address()
  return { server, url: `http://localhost:${port}` }
}

async function openPage(browser, url, id, lang) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => console.error(`page error (${id} ${lang}):`, e.message))
  await page.goto(`${url}/motion/lessons/film/index.html?id=${id}&lang=${lang}`)
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 })
  return page
}

/** Lossless frames: JPEG input cost more bits and less sharpness after x264 (see encode-settings). */
const shot = async (page, t) => {
  await page.evaluate((time) => window.seek(time), t)
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } })
}

/** Renders frames [from, to) into one H.264 chunk. */
async function renderChunk(browser, url, id, lang, from, to, file, progress) {
  const page = await openPage(browser, url, id, lang)
  const ffmpeg = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', ...encodeArgs(), '-an', file])
  const done = new Promise((resolve, reject) => ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))))
  for (let f = from; f < to; f++) {
    const buffer = await shot(page, f / FPS)
    if (!ffmpeg.stdin.write(buffer)) await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve))
    progress()
  }
  ffmpeg.stdin.end()
  await done
  await page.close()
}

async function renderVideo(browser, url, id, lang) {
  const timing = JSON.parse(readFileSync(join(lessonOutDir(id), `timing.${lang}.json`), 'utf8'))
  const total = Math.ceil(timing.duration * FPS)
  const dir = join(lessonOutDir(id), `chunks-${lang}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const size = Math.ceil(total / WORKERS)
  let done = 0
  const started = Date.now()
  const progress = () => {
    if (++done % 900 === 0) console.log(`  ${id} ${lang}: ${done}/${total} frames · ${((Date.now() - started) / 1000).toFixed(0)} s`)
  }
  const chunks = Array.from({ length: WORKERS }, (_, k) => ({ from: k * size, to: Math.min(total, (k + 1) * size), file: join(dir, `${String(k).padStart(2, '0')}.mp4`) })).filter((c) => c.from < c.to)
  await Promise.all(chunks.map((c) => renderChunk(browser, url, id, lang, c.from, c.to, c.file, progress)))
  writeFileSync(join(dir, 'list.txt'), chunks.map((c) => `file '${c.file}'`).join('\n'))
  const silent = join(dir, 'video.mp4')
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'), '-c', 'copy', silent])
  const out = videoPath(id, lang)
  mkdirSync(dirname(out), { recursive: true })
  mixAudio(silent, join(lessonOutDir(id), `narration.${lang}.wav`), timing.duration, out)
  rmSync(dir, { recursive: true, force: true })
  console.log(`✓ ${id} ${lang}: ${total} frames → ${out.replace(REPO_ROOT, '')} (${((Date.now() - started) / 1000).toFixed(0)} s)`)
}

/** One frame per beat, 70% into its voice, tiled 6 across: the review sheet. */
async function contactSheet(browser, url, id, lang) {
  const timing = JSON.parse(readFileSync(join(lessonOutDir(id), `timing.${lang}.json`), 'utf8'))
  const dir = join(lessonOutDir(id), `contact-${lang}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const page = await openPage(browser, url, id, lang)
  for (const [i, beat] of timing.beats.entries()) {
    writeFileSync(join(dir, `b${String(i).padStart(3, '0')}.png`), await shot(page, beat.speech + beat.speechDuration * 0.7))
  }
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1', '-i', join(dir, 'b%03d.png'), '-vf', `scale=640:360,tile=6x${Math.ceil(timing.beats.length / 6)}`, '-frames:v', '1', join(lessonOutDir(id), `contact-${lang}.png`)])
  console.log(`contact sheet → ${join(lessonOutDir(id), `contact-${lang}.png`)} (full frames in ${dir})`)
}

const { server, url } = await startServer()
const browser = await chromium.launch()
try {
  for (const id of ids) {
    for (const lang of langs) {
      if (opt.contact) await contactSheet(browser, url, id, lang)
      else if (opt.at) {
        const dir = join(lessonOutDir(id), 'frames')
        mkdirSync(dir, { recursive: true })
        const page = await openPage(browser, url, id, lang)
        for (const t of String(opt.at).split(',').map(Number)) writeFileSync(join(dir, `${lang}-${t.toFixed(2)}.png`), await shot(page, t))
        console.log(`frames → ${dir}`)
      } else await renderVideo(browser, url, id, lang)
    }
  }
  if (!opt.contact && !opt.at) console.log(`manifest: ${writeVideoManifest().count} videos`)
} finally {
  await browser.close()
  await server.close()
}
