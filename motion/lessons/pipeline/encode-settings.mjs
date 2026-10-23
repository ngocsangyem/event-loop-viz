// Encoding settings for lesson videos, in one place. Lessons are mostly still text on a flat dark
// background with small moving parts. Measured on a 20 s execution segment against lossless
// frames: PNG input at CRF 24 with x264's animation tuning keeps SSIM 0.9991 at ~0.9 MB, sharper
// and smaller than JPEG input at CRF 20 (0.9985, 1.2 MB). The showreel keeps CRF 16.
import { execFileSync, spawnSync } from 'node:child_process'

export const CRF = 24
const LOUDNESS = 'I=-14:TP=-1.5:LRA=11'

export const encodeArgs = () => [
  // Screenshots are full-range RGB; browsers expect limited-range BT.709 yuv420p.
  '-vf', 'scale=out_range=tv:out_color_matrix=bt709,format=yuv420p',
  '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', String(CRF),
  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1',
  // A keyframe every 2 s keeps seeking in the browser quick.
  '-g', '60', '-keyint_min', '30',
]

/** First loudnorm pass: ffmpeg prints the measured values as JSON on stderr. */
function measureLoudness(file) {
  const run = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `loudnorm=${LOUDNESS}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' })
  const text = run.stderr ?? ''
  return JSON.parse(text.slice(text.lastIndexOf('{'), text.lastIndexOf('}') + 1))
}

/** Muxes the picture with the voice track, normalised to -14 LUFS in two passes. */
export function mixAudio(video, narration, duration, out) {
  const m = measureLoudness(narration)
  const filter = `loudnorm=${LOUDNESS}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', video, '-i', narration, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', filter, '-c:a', 'aac', '-b:a', '128k', '-ac', '1', '-t', String(duration), '-movflags', '+faststart', out])
}
