// Every lesson, by example id. Each `<example-id>.ts` file here is picked up on its own: a new
// example gets a video by adding its content file (the pipeline checks it against the Trace).
import type { LessonContent } from '../lesson-types'

const files = import.meta.glob<{ default: LessonContent }>(['./*.ts', '!./index.ts', '!./define-lesson.ts'], { eager: true })

export const LESSONS: Readonly<Record<string, LessonContent>> = Object.fromEntries(
  Object.values(files).map((file) => [file.default.id, file.default]),
)
