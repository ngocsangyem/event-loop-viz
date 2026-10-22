// Renders the film frame by frame through window.seek(t) and encodes H.264 yuv420p, CRF 16.
//   node render.mjs              full render → out/event-loop-showreel.mp4
//   node render.mjs --contact    one frame per beat → out/contact-sheet.png (+ out/contact/*.png)
//   node render.mjs --at=1.2,3.4 single frames → out/frames/at-<t>.png
// Motion blur: each frame averages SUBFRAMES samples across a 180° shutter, clamped so a sample
// never crosses a cut (cuts stay single-frame hard cuts).
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { serve } from './lib/static-server.mjs'
import { SECTIONS, DURATION } from './film/cues.js'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'out')
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=')
  return [k, v ?? true]
}))
const FPS = Number(args.fps ?? 60)
const SUBFRAMES = Number(args.subframes ?? 10)
const WORKERS = Number(args.workers ?? 6)
const SHUTTER = 0.5
const beats = JSON.parse(readFileSync(join(here, 'beats.json'), 'utf8'))
const cutTimes = [...new Set(Object.values(SECTIONS).flat())].map((b) => beats.offset + b * beats.period).sort((a, b) => a - b)

// Clamp a sub-sample into the same shot as the frame it belongs to.
function clampToShot(t, center) {
  const lo = Math.max(0, ...cutTimes.filter((c) => c <= center + 1e-6))
  const hi = Math.min(DURATION - 1e-4, ...cutTimes.filter((c) => c > center + 1e-6).map((c) => c - 1e-4))
  return Math.min(hi, Math.max(lo, t))
}

async function openPages(n, base) {
  const browser = await chromium.launch()
  const pages = []
  for (let i = 0; i < n; i++) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
    await page.addInitScript((b) => (window.__BEATS = b), beats)
    page.on('pageerror', (e) => console.error('page error:', e.message))
    await page.goto(`${base}/film/index.html`)
    await page.waitForFunction(() => window.__ready === true)
    pages.push(page)
  }
  return { browser, pages }
}

async function shoot(page, t, path, label) {
  await page.evaluate(
    ([time, text]) => {
      window.seek(time)
      let tag = document.getElementById('__label')
      if (text && !tag) {
        tag = Object.assign(document.createElement('div'), { id: '__label' })
        Object.assign(tag.style, { position: 'fixed', left: '0', top: '0', padding: '10px 18px', font: "500 44px 'JetBrains Mono'", background: '#d97757', color: '#141413', zIndex: 99 })
        document.body.append(tag)
      }
      if (tag) tag.textContent = text ?? ''
    },
    [t, label],
  )
  await page.screenshot({ path, type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } })
}

const server = await serve(here)
mkdirSync(out, { recursive: true })

if (args.contact !== undefined) {
  // One frame per beat, sampled 40% into the beat so each beat's move has landed.
  const dir = join(out, 'contact')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const { browser, pages } = await openPages(4, server.url)
  const jobs = Array.from({ length: 32 }, (_, b) => b)
  await Promise.all(pages.map(async (page, w) => {
    for (let b = w; b < 32; b += pages.length) await shoot(page, beats.offset + (b + 0.4) * beats.period, join(dir, `b${String(b).padStart(2, '0')}.png`), `b${b}`)
  }))
  await browser.close()
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1', '-i', join(dir, 'b%02d.png'), '-vf', 'scale=480:270,tile=8x4', '-frames:v', '1', join(out, 'contact-sheet.png')])
  console.log(`contact sheet · ${jobs.length} beats → out/contact-sheet.png`)
} else if (args.at) {
  const dir = join(out, 'frames')
  mkdirSync(dir, { recursive: true })
  const { browser, pages } = await openPages(1, server.url)
  for (const t of args.at.split(',').map(Number)) await shoot(pages[0], t, join(dir, `at-${t.toFixed(3)}.png`), `${t.toFixed(3)}s`)
  await browser.close()
  console.log(`frames → out/frames/`)
} else {
  const dir = join(out, 'subframes')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const frames = Math.round(DURATION * FPS)
  const total = frames * SUBFRAMES
  const { browser, pages } = await openPages(WORKERS, server.url)
  let done = 0
  const started = Date.now()
  await Promise.all(pages.map(async (page, w) => {
    for (let i = w; i < total; i += pages.length) {
      const f = Math.floor(i / SUBFRAMES)
      const j = i % SUBFRAMES
      const center = f / FPS
      const t = clampToShot(center + ((j + 0.5) / SUBFRAMES - 0.5) * (SHUTTER / FPS), center)
      await shoot(page, t, join(dir, `${String(i).padStart(6, '0')}.png`))
      if (++done % 240 === 0) console.log(`${done}/${total} samples · ${((Date.now() - started) / 1000).toFixed(0)}s`)
    }
  }))
  await browser.close()

  const mp4 = join(out, 'event-loop-showreel.mp4')
  const blur = SUBFRAMES > 1 ? `tmix=frames=${SUBFRAMES},select='eq(mod(n\\,${SUBFRAMES})\\,${SUBFRAMES - 1})',` : ''
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
    '-framerate', String(FPS * SUBFRAMES), '-i', join(dir, '%06d.png'),
    '-i', join(out, 'score.wav'),
    '-vf', `${blur}setpts=N/(${FPS}*TB),format=yuv420p`, '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '320k', '-t', String(DURATION), '-movflags', '+faststart', mp4], { stdio: 'inherit' })
  rmSync(dir, { recursive: true, force: true })
  console.log(`rendered ${frames} frames → ${mp4}`)
}
server.close()
