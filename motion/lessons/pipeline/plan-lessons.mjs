// Step 1 of the lesson pipeline: run each example in the real engine and build its LessonPlan
// for both languages → motion/lessons/out/<id>/plan.<lang>.json.
//   node motion/lessons/pipeline/plan-lessons.mjs [example-id ...]
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { openAppModules } from './load-app-modules.mjs'
import { lessonOutDir } from './lesson-paths.mjs'

const app = await openAppModules()
let failed = 0
try {
  const { findExample } = await app.load('/src/examples/example-library.ts')
  const { runScript } = await app.load('/src/runner/run-script.ts')
  const { LESSONS } = await app.load('/motion/lessons/content/index.ts')
  const { buildLessonPlan } = await app.load('/motion/lessons/timeline/build-lesson-plan.ts')
  const { checkLessonPlan } = await app.load('/motion/lessons/timeline/check-lesson-plan.ts')
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(LESSONS)
  for (const id of ids) {
    try {
      const content = LESSONS[id]
      const example = findExample(id)
      if (!content || !example) throw new Error(`no ${content ? 'example' : 'lesson content'} for ${id}`)
      const run = await runScript(example.script)
      if (run.kind !== 'ran') throw new Error(`run ended with ${run.kind}`)
      const dir = lessonOutDir(id)
      mkdirSync(dir, { recursive: true })
      for (const lang of ['vi', 'en']) {
        const plan = buildLessonPlan(content, run.trace, lang)
        const problems = checkLessonPlan(plan, run.observableOutput)
        if (problems.length) throw new Error(`${lang}:\n  - ${problems.join('\n  - ')}`)
        writeFileSync(join(dir, `plan.${lang}.json`), JSON.stringify(plan, null, 1))
        const steps = plan.beats.filter((b) => b.scene === 'execute')
        console.log(`${id} ${lang}: ${plan.beats.length} beats, ${steps.length} steps, ${plan.snapshots.length} views`)
      }
    } catch (error) {
      failed++
      console.error(`✗ ${id}: ${error.message}`)
    }
  }
} finally {
  await app.close()
}
process.exit(failed ? 1 : 0)
