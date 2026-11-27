// Play sessions (kept in userData/playlog.json) and the numbers the Stats page shows.
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import type { PlayStats } from '@shared/types'
import { listInstances } from './instances'

interface Session { instanceId: string; name: string; start: number; sec: number }
const file = () => join(app.getPath('userData'), 'playlog.json')

async function load(): Promise<Session[]> {
  try { return existsSync(file()) ? (JSON.parse(await readFile(file(), 'utf8')) as Session[]) : [] } catch { return [] }
}

export async function recordSession(instanceId: string, name: string, start: number, sec: number): Promise<void> {
  if (sec < 5) return
  const all = await load()
  all.push({ instanceId, name, start, sec })
  await writeFile(file(), JSON.stringify(all.slice(-5000)))
}

/** Local date as YYYY-MM-DD. */
export const dayKey = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Current and longest run of days in a row with play. The current streak survives until a whole day is missed. */
export function streaks(days: Set<string>, now = Date.now()): { current: number; longest: number } {
  const sorted = [...days].sort()
  let longest = 0
  let run = 0
  let prev: number | null = null
  for (const k of sorted) {
    const t = new Date(`${k}T12:00:00`).getTime()
    run = prev != null && Math.round((t - prev) / 86_400_000) === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = t
  }
  let current = 0
  let t = now
  if (!days.has(dayKey(t))) t -= 86_400_000 // haven't played yet today: yesterday still counts
  while (days.has(dayKey(t))) { current++; t -= 86_400_000 }
  return { current, longest }
}

export async function getStats(): Promise<PlayStats> {
  const sessions = await load()
  const instances = await listInstances().catch(() => [])
  const days = new Map<string, number>()
  for (const s of sessions) days.set(dayKey(s.start), (days.get(dayKey(s.start)) ?? 0) + s.sec)
  // Older play from before the log existed: count each instance's last-played day.
  for (const i of instances) if (i.lastPlayed && i.playtimeSec > 0 && !days.size) days.set(dayKey(Date.parse(i.lastPlayed)), 0)
  const now = Date.now()
  const week = Array.from({ length: 7 }, (_, i) => {
    const k = dayKey(now - (6 - i) * 86_400_000)
    return { day: k, sec: days.get(k) ?? 0 }
  })
  const top = instances
    .filter((i) => i.playtimeSec > 0)
    .sort((a, b) => b.playtimeSec - a.playtimeSec)
    .slice(0, 5)
    .map((i) => ({ id: i.id, name: i.name, sec: i.playtimeSec }))
  const { current, longest } = streaks(new Set(days.keys()), now)
  return {
    totalSec: instances.reduce((n, i) => n + (i.playtimeSec ?? 0), 0),
    todaySec: days.get(dayKey(now)) ?? 0,
    sessions: sessions.length,
    longestSessionSec: sessions.reduce((n, s) => Math.max(n, s.sec), 0),
    currentStreak: current,
    longestStreak: longest,
    daysPlayed: [...days.keys()].length,
    week,
    top
  }
}
