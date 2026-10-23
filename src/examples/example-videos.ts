// Lesson videos for the built-in examples. The manifest is written by the video pipeline
// (motion/lessons) from the MP4s that exist, so an example offers a video only when its file does.
// Files are served from public/ and fetched only when a learner presses play.
import manifest from './example-video-manifest.json'

export type VideoLang = 'en' | 'vi'

export interface ExampleVideo {
  src: string
  /** The language of the file: the app's language, or the other one when only that exists. */
  lang: VideoLang
  seconds: number
}

const MANIFEST: Readonly<Record<string, Partial<Record<VideoLang, { seconds: number; bytes: number }>>>> = manifest

export function hasExampleVideo(id: string | null): boolean {
  return id !== null && Object.keys(MANIFEST[id] ?? {}).length > 0
}

/** The video for an example in the learner's language, falling back to the other language. */
export function exampleVideo(id: string | null, lang: VideoLang): ExampleVideo | null {
  if (id === null) return null
  const entry = MANIFEST[id]
  if (!entry) return null
  const pick = entry[lang] ? lang : (Object.keys(entry)[0] as VideoLang | undefined)
  if (!pick) return null
  return { src: `${import.meta.env.BASE_URL}videos/event-loop/${id}/${pick}.mp4`, lang: pick, seconds: entry[pick]!.seconds }
}
