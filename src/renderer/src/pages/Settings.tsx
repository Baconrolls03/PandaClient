import { useEffect, useState } from 'react'
import { Check, FolderOpen, Loader2, Search } from 'lucide-react'
import type { JavaInstall, Settings as SettingsT, SystemInfo } from '@shared/types'
import { api } from '@/lib/api'
import { Button, Card, PathField, Toggle } from '@/components/ui'

interface Props {
  settings: SettingsT
  update: (patch: Partial<SettingsT>) => void
}

const gb = (mb: number) => `${(mb / 1024).toFixed(1).replace(/\.0$/, '')} GB`

export function Settings({ settings, update }: Props) {
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [javas, setJavas] = useState<JavaInstall[] | null>(null)
  const [detecting, setDetecting] = useState(false)

  useEffect(() => {
    api.system.info().then(setInfo)
  }, [])

  async function detect() {
    setDetecting(true)
    try {
      setJavas(await api.system.detectJava())
    } finally {
      setDetecting(false)
    }
  }

  const minRam = 1024
  // Leave at least 2 GB for the OS.
  const maxRam = Math.max(minRam * 2, Math.floor(((info?.totalMemMb ?? 8192) - 2048) / 512) * 512)
  const ram = Math.min(settings.ramMb, maxRam)
  const fill = ((ram - minRam) / (maxRam - minRam)) * 100

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">Changes save automatically.</p>
      </div>

      <Card title="Memory" description="How much RAM Minecraft can use. 4 GB is plenty for most Fabric setups.">
        <div className="flex items-center gap-5">
          <input
            type="range"
            className="panda-range flex-1"
            min={minRam}
            max={maxRam}
            step={512}
            value={ram}
            style={{ ['--fill' as string]: `${fill}%` }}
            onChange={(e) => update({ ramMb: Number(e.target.value) })}
          />
          <div className="w-20 rounded-xl bg-raised py-2 text-center text-sm font-semibold tabular-nums">{gb(ram)}</div>
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted">
          <span>{gb(minRam)}</span>
          <span>{info ? `${gb(info.totalMemMb)} installed` : ''}</span>
          <span>{gb(maxRam)}</span>
        </div>
      </Card>

      <Card title="Java" description="Leave empty and PandaClient picks the right Java for each version automatically.">
        <div className="flex gap-2">
          <PathField value={settings.javaPath} placeholder="Automatic" onChange={(v) => update({ javaPath: v })} />
          <Button onClick={detect} disabled={detecting}>
            {detecting ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Detect
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              const p = await api.settings.pickFile(settings.javaPath || undefined)
              if (p) update({ javaPath: p })
            }}
          >
            Browse
          </Button>
        </div>
        {javas && (
          <div className="mt-4 flex animate-pop flex-col gap-1.5">
            {javas.length === 0 && <p className="text-[13px] text-muted">No Java found. Automatic mode will download one from Mojang.</p>}
            {javas.map((j) => {
              const active = settings.javaPath === j.path
              return (
                <button
                  key={j.path}
                  onClick={() => update({ javaPath: active ? '' : j.path })}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all hover:bg-raised ${
                    active ? 'border-mint/50 bg-raised' : 'border-border bg-bg/50'
                  }`}
                >
                  <span className="rounded-md bg-blue/15 px-2 py-0.5 text-xs font-semibold text-blue">Java {j.major}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted">{j.path}</span>
                  {active && <Check size={16} className="text-mint" />}
                </button>
              )
            })}
          </div>
        )}
      </Card>

      <Card title="Game directory" description="Where versions, libraries, mods and worlds are stored.">
        <div className="flex gap-2">
          <PathField value={settings.gameDir} onChange={(v) => update({ gameDir: v })} />
          <Button
            onClick={async () => {
              const p = await api.settings.pickDirectory(settings.gameDir)
              if (p) update({ gameDir: p })
            }}
          >
            Change
          </Button>
          <Button variant="ghost" onClick={() => api.system.openPath(settings.gameDir)}>
            <FolderOpen size={16} />
            Open
          </Button>
        </div>
      </Card>

      <Card title="Launcher">
        <div className="flex items-center justify-between gap-6">
          <div>
            <div className="text-sm font-medium">Close launcher when the game starts</div>
            <div className="mt-0.5 text-[13px] text-muted">Frees up memory while you play.</div>
          </div>
          <Toggle label="Close launcher on launch" checked={settings.closeOnLaunch} onChange={(v) => update({ closeOnLaunch: v })} />
        </div>
      </Card>

      <p className="pb-2 text-center text-xs text-muted">
        PandaClient {info?.appVersion ?? ''} · Not affiliated with Mojang or Microsoft
      </p>
    </div>
  )
}
