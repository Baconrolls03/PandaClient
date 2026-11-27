import { useEffect, useState } from 'react'
import { CalendarDays, Clock, Flame, Gamepad2, Trophy } from 'lucide-react'
import type { PlayStats } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { playtime } from '@/lib/format'
import { Spinner } from '@/components/ui'

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function Tile({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-mint/40 bg-mint/10' : 'border-border bg-surface'}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  )
}

/** Playtime, play streaks and the instances you play most. */
export function Stats() {
  const { navigate } = useStore()
  const [s, setS] = useState<PlayStats | null>(null)
  useEffect(() => {
    api.stats.get().then(setS).catch(() => {})
  }, [])
  if (!s) return <Spinner className="mx-auto mt-20" />
  const max = Math.max(1, ...s.week.map((d) => d.sec))
  const weekTotal = s.week.reduce((n, d) => n + d.sec, 0)
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Stats</h1>
      <p className="mt-1 text-sm text-muted">How much you play, and your streak of days in a row.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          accent={s.currentStreak > 0}
          icon={<Flame size={14} className={s.currentStreak ? 'text-orange-400' : ''} />}
          label="Play streak"
          value={`${s.currentStreak} day${s.currentStreak === 1 ? '' : 's'}`}
          sub={s.currentStreak ? (s.todaySec ? 'You played today' : 'Play today to keep it') : 'Play today to start one'}
        />
        <Tile icon={<Trophy size={14} />} label="Best streak" value={`${s.longestStreak} day${s.longestStreak === 1 ? '' : 's'}`} />
        <Tile icon={<Clock size={14} />} label="Total playtime" value={playtime(s.totalSec)} sub={`${playtime(s.todaySec)} today`} />
        <Tile icon={<Gamepad2 size={14} />} label="Sessions" value={String(s.sessions)} sub={s.longestSessionSec ? `Longest ${playtime(s.longestSessionSec)}` : undefined} />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays size={15} /> Last 7 days
          </h2>
          <span className="text-xs text-muted">{playtime(weekTotal)} this week</span>
        </div>
        <div className="mt-4 flex h-40 items-end gap-3">
          {s.week.map((d, i) => {
            const date = new Date(`${d.day}T12:00:00`)
            const today = i === s.week.length - 1
            return (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5" title={`${date.toDateString()}: ${playtime(d.sec)}`}>
                <span className="text-[10px] tabular-nums text-muted">{d.sec ? playtime(d.sec) : ''}</span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t-md transition-all ${today ? 'bg-mint' : 'bg-blue/70'}`}
                    style={{ height: d.sec ? `${Math.max(4, (d.sec / max) * 100)}%` : 2, opacity: d.sec ? 1 : 0.25 }}
                  />
                </div>
                <span className={`text-xs ${today ? 'font-semibold text-text' : 'text-muted'}`}>{today ? 'Today' : DAY[date.getDay()]}</span>
              </div>
            )
          })}
        </div>
      </section>

      {s.top.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Most played</h2>
          {s.top.map((t, i) => (
            <button
              key={t.id}
              onClick={() => navigate({ name: 'instance', id: t.id })}
              className="mb-2 flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left hover:bg-raised"
            >
              <span className="w-5 text-center text-sm font-bold text-muted">{i + 1}</span>
              <span className="flex-1 truncate font-medium">{t.name}</span>
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-raised">
                <div className="h-full rounded-full bg-mint" style={{ width: `${(t.sec / s.top[0].sec) * 100}%` }} />
              </div>
              <span className="w-20 text-right text-sm tabular-nums text-muted">{playtime(t.sec)}</span>
            </button>
          ))}
        </section>
      )}
      <p className="mt-4 text-xs text-muted">{s.daysPlayed} day{s.daysPlayed === 1 ? '' : 's'} played in total. Streaks count from this update on.</p>
    </div>
  )
}
