// Writes src/examples/example-video-manifest.json from the MP4s that exist in
// public/videos/event-loop/<example-id>/<lang>.mp4, so the app offers a lesson video only when
// the file is really there. Run after rendering (render-lessons.mjs calls it).
//   node motion/lessons/pipeline/write-video-manifest.mjs
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { REPO_ROOT, VIDEOS_DIR } from './lesson-paths.mjs'

const LANGS = ['en', 'vi']

export function writeVideoManifest() {
  const manifest = {}
  const ids = existsSync(VIDEOS_DIR) ? readdirSync(VIDEOS_DIR).filter((d) => statSync(join(VIDEOS_DIR, d)).isDirectory()).sort() : []
  for (const id of ids) {
    for (const lang of LANGS) {
      const file = join(VIDEOS_DIR, id, `${lang}.mp4`)
      if (!existsSync(file)) continue
      const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim())
      manifest[id] ??= {}
      manifest[id][lang] = { seconds: Math.round(seconds), bytes: statSync(file).size }
    }
  }
  const out = join(REPO_ROOT, 'src/examples/example-video-manifest.json')
  writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`)
  return { out, count: Object.values(manifest).reduce((n, langs) => n + Object.keys(langs).length, 0) }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { out, count } = writeVideoManifest()
  console.log(`${count} videos → ${out.replace(REPO_ROOT, '')}`)
}
