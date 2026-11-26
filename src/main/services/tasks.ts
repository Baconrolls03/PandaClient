import { randomUUID } from 'node:crypto'
import type { Task } from '@shared/types'

const tasks = new Map<string, Task>()
const listeners = new Set<(tasks: Task[]) => void>()
let scheduled: NodeJS.Timeout | null = null

export function listTasks(): Task[] {
  return [...tasks.values()].reverse()
}

// Batch updates so download progress doesn't flood IPC.
function emit(now = false) {
  const flush = () => {
    scheduled = null
    const list = listTasks()
    listeners.forEach((l) => l(list))
  }
  if (now) {
    if (scheduled) clearTimeout(scheduled)
    flush()
  } else if (!scheduled) {
    scheduled = setTimeout(flush, 100)
  }
}

export function onTasksChanged(fn: (tasks: Task[]) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function dismissTask(id: string): void {
  tasks.delete(id)
  emit(true)
}

export interface TaskHandle {
  id: string
  update(detail: string, progress?: number | null): void
  done(detail?: string): void
  fail(error: unknown): void
}

export function startTask(title: string, instanceId?: string): TaskHandle {
  const id = randomUUID()
  tasks.set(id, { id, title, detail: 'Starting…', progress: null, status: 'running', instanceId })
  // Keep the list short: drop the oldest finished tasks.
  const finished = [...tasks.values()].filter((t) => t.status !== 'running')
  for (const t of finished.slice(0, Math.max(0, finished.length - 15))) tasks.delete(t.id)
  emit(true)

  const patch = (p: Partial<Task>, now = false) => {
    const t = tasks.get(id)
    if (!t) return
    tasks.set(id, { ...t, ...p })
    emit(now)
  }
  return {
    id,
    update: (detail, progress = null) => patch({ detail, progress }),
    done: (detail = 'Done') => {
      patch({ status: 'done', detail, progress: 1 }, true)
      setTimeout(() => tasks.get(id)?.status === 'done' && dismissTask(id), 10_000)
    },
    fail: (error) => patch({ status: 'error', error: error instanceof Error ? error.message : String(error) }, true)
  }
}

/** Run `fn` as a tracked task; rethrows after marking it failed. */
export async function withTask<T>(title: string, fn: (t: TaskHandle) => Promise<T>, instanceId?: string): Promise<T> {
  const t = startTask(title, instanceId)
  try {
    const r = await fn(t)
    t.done()
    return r
  } catch (e) {
    t.fail(e)
    throw e
  }
}
