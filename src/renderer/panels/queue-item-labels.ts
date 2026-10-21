/** `task-2` and `job-3` read as `Task #2` and `Job #3`: the same labels the caption and the Trace Events use. */
const numberOf = (id: string) => id.replace(/^[a-z]+-/, '')

export const taskRef = (taskId: string): string => `Task #${numberOf(taskId)}`
export const jobRef = (jobId: string): string => `Job #${numberOf(jobId)}`
