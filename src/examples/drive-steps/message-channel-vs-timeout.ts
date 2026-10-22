import type { CuratedDriveStep } from './curated-drive-step'

/** Drive me for the `message-channel-vs-timeout` example. Words: `drive.examples.messageChannelVsTimeout.*`. */
export const messageChannelVsTimeout: readonly CuratedDriveStep[] = [
  { key: 'scriptOnStack', at: { k: 'frame:push', where: { label: 'script' } }, target: 'call-stack' },
  { key: 'timer', at: { k: 'timer:init' }, target: 'web-apis' },
  { key: 'timerTask', at: { k: 'task:queue', nth: 2 }, target: 'task-queue' },
  { key: 'messageTask', at: { k: 'task:queue', nth: 3 }, target: 'task-queue' },
  { key: 'noJobs', at: { k: 'checkpoint:begin' }, target: 'event-loop' },
  { key: 'timerRuns', at: { k: 'task:begin', nth: 2 }, target: 'event-loop' },
  { key: 'timerStack', at: { k: 'frame:push', where: { label: '(anonymous)' }, after: { k: 'task:begin', nth: 2 } }, target: 'call-stack' },
  { key: 'messageRuns', at: { k: 'task:begin', nth: 3 }, target: 'event-loop' },
  { key: 'messageStack', at: { k: 'frame:push', where: { label: '(anonymous)' }, after: { k: 'task:begin', nth: 3 } }, target: 'call-stack' },
]
