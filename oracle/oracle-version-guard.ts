import type { TraceHeader } from '../src/trace/trace-event'

/** Chrome major encoded in a Host Profile id such as `chrome-155`. */
export function hostProfileChromeMajor(profile: TraceHeader['hostProfile']): number {
  return Number(profile.replace('chrome-', ''))
}

/** Chrome major of a recorded browser version such as `155.0.8059.85`. */
export function chromeMajorOf(version: string): number {
  return Number(version.split('.')[0])
}

/** True when a Golden was recorded by the Chrome major the Host Profile claims to match. */
export function goldenMatchesHostProfile(
  version: string,
  profile: TraceHeader['hostProfile'],
): boolean {
  return chromeMajorOf(version) === hostProfileChromeMajor(profile)
}
