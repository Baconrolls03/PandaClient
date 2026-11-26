import { useEffect, useMemo, useState } from 'react'
import type { LaunchProgress, Settings, VersionList } from '@shared/types'
import { api } from '@/lib/api'
import { Logo } from '@/components/Logo'
import { PlayButton } from '@/components/PlayButton'
import { ProgressBar } from '@/components/ProgressBar'
import { VersionSelect } from '@/components/VersionSelect'
import { NewsCard } from '@/components/NewsCard'
import { ModsCard } from '@/components/ModsCard'

interface Props {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

export function Home({ settings, update }: Props) {
  const [list, setList] = useState<VersionList | null>(null)
  const [progress, setProgress] = useState<LaunchProgress>({ stage: 'idle', progress: null, message: '' })

  useEffect(() => {
    api.versions.list().then(setList)
    return api.game.onProgress(setProgress)
  }, [])

  // Saved choice if it still exists, otherwise the newest release Fabric supports.
  const selected = useMemo(() => {
    if (!list) return ''
    const ids = new Set(list.versions.map((v) => v.id))
    if (settings.selectedVersion && ids.has(settings.selectedVersion)) return settings.selectedVersion
    return list.versions.find((v) => v.type === 'release' && v.fabric)?.id ?? list.latestRelease
  }, [list, settings.selectedVersion])

  const current = list?.versions.find((v) => v.id === selected)
  const busy = progress.stage !== 'idle' && progress.stage !== 'error'
  const noVersions = list != null && list.versions.length === 0

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <section className="relative z-10 rounded-2xl border border-border bg-surface p-8 shadow-soft">
        {/* Soft accent glows, clipped separately so the version dropdown can overflow the card */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-mint/10 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 size-80 rounded-full bg-blue/10 blur-3xl" />
          <Logo size={180} className="absolute -right-6 bottom-[-28px] rotate-[-8deg] opacity-[0.07]" />
        </div>

        <div className="relative">
          <p className="mb-1 text-sm font-medium text-mint">Welcome back</p>
          <h1 className="text-3xl font-bold tracking-tight">Ready when you are</h1>
          <p className="mt-2 text-sm text-muted">
            {current
              ? `Minecraft ${current.id} · ${current.fabric ? 'Fabric + performance mods' : 'Vanilla'} · ${(settings.ramMb / 1024).toFixed(1).replace(/\.0$/, '')} GB RAM`
              : noVersions
                ? "Couldn't reach Mojang. Check your connection."
                : 'Fetching versions from Mojang…'}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <VersionSelect
              versions={list?.versions ?? []}
              value={selected}
              onChange={(id) => update({ selectedVersion: id })}
              showSnapshots={settings.showSnapshots}
              onShowSnapshots={(v) => update({ showSnapshots: v })}
              offline={list?.offline}
              loading={!list}
            />
            <PlayButton busy={busy} disabled={!selected} onClick={() => api.game.launch(selected)} />
          </div>
        </div>
      </section>

      <ProgressBar state={progress} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <NewsCard />
        <ModsCard fabric={current?.fabric ?? true} />
      </div>
    </div>
  )
}
