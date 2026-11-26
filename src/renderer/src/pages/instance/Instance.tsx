import { useEffect, useState } from 'react'
import { CalendarDays, Clock, Copy, FileArchive, FileText, Folder, FolderOpen, Globe, History, Image, Package, ScrollText, Settings2, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore, type InstanceTab } from '@/lib/store'
import { playtime, timeAgo } from '@/lib/format'
import { backgroundOf } from '@/lib/icons'
import { applyIconChoice, choiceOf } from '@/lib/iconChoice'
import { Badge, Button, Empty, InstanceIcon, LoaderBadge, Tabs } from '@/components/ui'
import { PlayButton } from '@/components/PlayButton'
import { IconEditor } from '@/modals/IconEditor'
import { DeleteInstanceModal } from '@/modals/DeleteInstanceModal'
import { ContentTab } from './ContentTab'
import { WorldsTab } from './WorldsTab'
import { ScreenshotsTab } from './ScreenshotsTab'
import { FilesTab } from './FilesTab'
import { LogsTab } from './LogsTab'
import { InstanceSettingsTab } from './InstanceSettingsTab'

const TABS: { id: InstanceTab; label: string; icon: React.ReactNode }[] = [
  { id: 'content', label: 'Content', icon: <Package size={15} /> },
  { id: 'worlds', label: 'Worlds', icon: <Globe size={15} /> },
  { id: 'screenshots', label: 'Screenshots', icon: <Image size={15} /> },
  { id: 'files', label: 'Files', icon: <Folder size={15} /> },
  { id: 'logs', label: 'Logs', icon: <ScrollText size={15} /> },
  { id: 'settings', label: 'Settings', icon: <Settings2 size={15} /> }
]

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-xl bg-raised text-muted">{icon}</span>
      <div>
        <div className="text-xs font-semibold">{label}</div>
        <div className="text-xs text-muted">{value}</div>
      </div>
    </div>
  )
}

export function Instance({ id, tab = 'content' }: { id: string; tab?: InstanceTab }) {
  const { instances, navigate, attempt, toast, running } = useStore()
  const [deleting, setDeleting] = useState(false)
  const [editingIcon, setEditingIcon] = useState(false)
  const [contentCount, setContentCount] = useState<number | null>(null)
  const inst = instances.find((i) => i.id === id)
  useEffect(() => {
    api.content.list(id).then((l) => setContentCount(l.filter((i) => i.enabled).length)).catch(() => setContentCount(null))
  }, [id, tab])

  if (!inst)
    return (
      <div className="p-8">
        <Empty icon={<Package size={22} />} title="Instance not found" action={<Button onClick={() => navigate({ name: 'library' })}>Back to library</Button>} />
      </div>
    )

  const setTab = (t: InstanceTab) => navigate({ name: 'instance', id, tab: t })
  const bg = inst.iconPreset ? backgroundOf(inst.iconPreset.bg) : null
  const banner = bg ? `linear-gradient(135deg, ${bg.from}, ${bg.to})` : 'linear-gradient(135deg, color-mix(in srgb, var(--color-mint) 55%, var(--color-surface)), var(--color-surface))'

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-[300px_1fr] gap-6 p-8">
      {/* Left: identity + actions */}
      <aside className="flex flex-col gap-4 self-start">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          <div className="relative h-28" style={{ background: banner }}>
            {inst.iconUrl && <img src={inst.iconUrl} alt="" className="absolute inset-0 size-full scale-150 object-cover opacity-60 blur-2xl" />}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgb(255_255_255/0.05)_0_8px,transparent_8px_16px)]" />
            <button
              aria-label="Customise icon"
              title="Customise icon"
              onClick={() => setEditingIcon(true)}
              className="absolute right-3 top-3 grid size-9 place-items-center rounded-xl bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/55"
            >
              <Settings2 size={16} />
            </button>
          </div>
          <div className="-mt-10 px-5 pb-5">
            <button onClick={() => setEditingIcon(true)} className="relative rounded-2xl ring-4 ring-surface transition-transform hover:scale-[1.03]" title="Customise icon">
              <InstanceIcon url={inst.iconUrl} preset={inst.iconPreset} size={76} className="rounded-2xl" />
            </button>
            <h1 className="mt-3 truncate text-xl font-bold tracking-tight">{inst.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <LoaderBadge version={inst.loaderVersion} />
              <Badge>Minecraft {inst.mcVersion}</Badge>
              {inst.modpack && (
                <button onClick={() => navigate({ name: 'project', id: inst.modpack!.projectId })}>
                  <Badge tone="blue">
                    <FileArchive size={11} /> {inst.modpack.title}
                  </Badge>
                </button>
              )}
            </div>
            <div className="mt-5">
              <PlayButton instanceId={inst.id} size="md" wide label="Play now" />
            </div>
            {running.has(inst.id) && <p className="mt-2 text-center text-xs font-medium text-mint">Running now</p>}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => api.instances.openFolder(inst.id)}>
                <FolderOpen size={14} /> Folder
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const p = await attempt(() => api.instances.exportMrpack(inst.id))
                  if (p) toast(`Exported to ${p}`, 'success')
                }}
              >
                <FileText size={14} /> Export
              </Button>
              <Button variant="secondary" size="sm" onClick={() => attempt(() => api.instances.duplicate(inst.id), 'Instance duplicated')}>
                <Copy size={14} /> Duplicate
              </Button>
              <Button variant="danger" size="sm" onClick={() => setDeleting(true)}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <Stat icon={<Package size={16} />} label="Content" value={contentCount == null ? '…' : `${contentCount} enabled`} />
          <Stat icon={<Clock size={16} />} label="Play time" value={inst.playtimeSec ? playtime(inst.playtimeSec) : '0m'} />
          <Stat icon={<History size={16} />} label="Last played" value={inst.lastPlayed ? timeAgo(inst.lastPlayed) : 'Never played'} />
          <Stat icon={<CalendarDays size={16} />} label="Created" value={timeAgo(inst.created)} />
        </div>
      </aside>

      {/* Right: tabs */}
      <div className="flex min-w-0 flex-col gap-5">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        <div key={tab} className="animate-pop">
          {tab === 'content' && <ContentTab inst={inst} />}
          {tab === 'worlds' && <WorldsTab inst={inst} />}
          {tab === 'screenshots' && <ScreenshotsTab inst={inst} />}
          {tab === 'files' && <FilesTab inst={inst} />}
          {tab === 'logs' && <LogsTab inst={inst} />}
          {tab === 'settings' && <InstanceSettingsTab inst={inst} onDelete={() => setDeleting(true)} onEditIcon={() => setEditingIcon(true)} />}
        </div>
      </div>

      {deleting && <DeleteInstanceModal inst={inst} onClose={() => setDeleting(false)} />}
      {editingIcon && (
        <IconEditor
          initial={choiceOf(inst)}
          onClose={() => setEditingIcon(false)}
          onSave={async (c) => {
            setEditingIcon(false)
            await attempt(() => applyIconChoice(inst.id, c), 'Icon updated')
          }}
        />
      )}
    </div>
  )
}
