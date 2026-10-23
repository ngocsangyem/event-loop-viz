import { describe, expect, it } from 'vitest'
import { EXAMPLES } from '../example-library'
import { exampleVideo, hasExampleVideo } from '../example-videos'
import manifest from '../example-video-manifest.json'

describe('example videos', () => {
  it('lists only ids of built-in examples', () => {
    const ids = new Set(EXAMPLES.map((e) => e.id))
    for (const id of Object.keys(manifest)) expect(ids.has(id)).toBe(true)
  })

  it('offers no video for a Script that is not an example', () => {
    expect(hasExampleVideo(null)).toBe(false)
    expect(exampleVideo(null, 'en')).toBeNull()
    expect(exampleVideo('not-an-example', 'vi')).toBeNull()
  })

  it('plays the file in the learner language, under public/videos', () => {
    const [id, langs] = Object.entries(manifest)[0] ?? []
    if (!id || !langs) return
    for (const lang of Object.keys(langs) as ('en' | 'vi')[]) {
      const video = exampleVideo(id, lang)
      expect(video).toEqual({ src: `/videos/event-loop/${id}/${lang}.mp4`, lang, seconds: expect.any(Number) })
    }
  })
})
