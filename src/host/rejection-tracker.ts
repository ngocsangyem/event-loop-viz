/**
 * Bookkeeping for HostPromiseRejectionTracker (HTML "about-to-be-notified rejected
 * promises" list and "outstanding rejected promises" weak set). Pure state: the
 * host decides when to emit Trace Events and when the notification Tasks run.
 */

export interface RejectedPromise {
  pid: string
  message: string
}

export interface NotificationTask extends RejectedPromise {
  taskId: string
  /** Virtual Clock time the Task was queued; timers already due at that time run first. */
  dueUs: number
  outcome: 'unhandled' | 'handled'
}

export function createRejectionTracker() {
  /** Rejected with no handler yet; examined at the end of the next Checkpoint. */
  const aboutToBeNotified = new Map<string, RejectedPromise>()
  /** Already reported as unhandled: a later handler must fire rejectionhandled. */
  const outstanding = new Map<string, RejectedPromise>()
  const notificationTasks: NotificationTask[] = []

  return {
    /** Returns the promise that now needs a `handled` notification, if any. */
    track(pid: string, op: 'reject' | 'handle', message: string): RejectedPromise | undefined {
      if (op === 'reject') {
        aboutToBeNotified.set(pid, { pid, message })
        return undefined
      }
      // A handler arriving before notification cancels it silently (HTML 8.1.6.4).
      if (aboutToBeNotified.delete(pid)) return undefined
      const reported = outstanding.get(pid)
      if (!reported) return undefined
      outstanding.delete(pid)
      return reported
    },

    /** Empties the about-to-be-notified list; each entry is still unhandled by construction. */
    takeAboutToBeNotified(): RejectedPromise[] {
      const list = [...aboutToBeNotified.values()]
      aboutToBeNotified.clear()
      for (const item of list) outstanding.set(item.pid, item)
      return list
    },

    /** Still awaiting its check, or reported unhandled (a late handler fires rejectionhandled). */
    tracked(pid: string): boolean {
      return aboutToBeNotified.has(pid) || outstanding.has(pid) || notificationTasks.some((t) => t.pid === pid)
    },

    enqueue(task: NotificationTask) {
      notificationTasks.push(task)
    },

    /** Oldest queued notification Task (FIFO), left in place until `dequeue`. */
    peek(): NotificationTask | undefined {
      return notificationTasks[0]
    },

    dequeue(): NotificationTask | undefined {
      return notificationTasks.shift()
    },
  }
}
