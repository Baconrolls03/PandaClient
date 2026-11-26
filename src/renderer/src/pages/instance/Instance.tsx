import { useState } from 'react'
import { Copy, FileArchive, FileText, Folder, FolderOpen, Globe, Image, Package, ScrollText, Settings2, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore, type InstanceTab } from '@/lib/store'
import { timeAgo } from '@/lib/format'
import { Badge, Button, Empty, InstanceIcon, LoaderBadge, Menu, Tabs } from '@/components/ui'
import { PlayButton } from '@/components/PlayButton'
import { ContentTab } from './ContentTab'
import { WorldsTab } from './WorldsTab'
import { ScreenshotsTab } from './ScreenshotsTab'
import { FilesTab } from './FilesTab'
import { LogsTab } from './LogsTab'
import { InstanceSettingsTab } from './InstanceSettingsTab'
import { DeleteInstanceModal } from '@/modals/DeleteInstanceModal'

const TABS: { id: InstanceTab; label: string; icon: React.ReactNode }[] = [
  { id: 'content', label: 'Content', icon: <Package size={15} /> },
  { id: 'worlds', label: 'Worlds', icon: <Globe size={15} /> },
  { id: 'screenshots', label: 'Screenshots', icon: <Image size={15} /> },
  { id: 'files', label: 'Files', icon: <Folder size={15} /> },
  { id: 'logs', label: 'Logs', icon: <ScrollText size={15} /> },
  { id: 'settings', label: 'Settings', icon: <Settings2 size={15} /> }
]

export function Instance({ id, tab = 'content' }: { id: string; tab?: InstanceTab }) {
  const { instances, navigate, launch, progress, attempt, toast } = useStore()
  const [deleting, setDeleting] = useState(false)
  const inst = instances.find((i) => i.id === id)
  if (!inst)
    return (
      <div className="p-8">
        <Empty icon={<Package size={22} />} title="Instance not found" action={<Button onClick={() => navigate({ name: 'library' })}>Back to library</Button>} />
      </div>
    )

  const busy = progress.instanceId === inst.id && progress.stage !== 'idle' && progress.stage !== 'error'
  const setTab = (t: InstanceTab) => navigate({ name: 'instance', id, tab: t })

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-soft">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-mint/8 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <InstanceIcon url={inst.iconUrl} preset={inst.iconPreset} size={80} className="rounded-2xl shadow-lift" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight">{inst.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
              <LoaderBadge version={inst.loaderVersion} />
              <Badge>Minecraft {inst.mcVersion}</Badge>
              {inst.modpack && (
                <button onClick={() => navigate({ name: 'project', id: inst.modpack!.projectId })}>
                  <Badge tone="blue">
                    <FileArchive size={11} /> {inst.modpack.title}
                  </Badge>
                </button>
              )}
              <span className="text-xs">{inst.lastPlayed ? `Played ${timeAgo(inst.lastPlayed)}` : 'Never played'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => api.instances.openFolder(inst.id)} title="Open folder">
              <FolderOpen size={16} />
            </Button>
            <Menu
              items={[
                { label: 'Duplicate', icon: <Copy size={15} />, onClick: () => attempt(() => api.instances.duplicate(inst.id), 'Instance duplicated') },
                {
                  label: 'Export as .mrpack',
                  icon: <FileText size={15} />,
                  onClick: async () => {
                    const p = await attempt(() => api.instances.exportMrpack(inst.id))
                    if (p) toast(`Exported to ${p}`, 'success')
                  }
                },
                {
                  label: 'Delete instance',
                  icon: <Trash2 size={15} />,
                  danger: true,
                  onClick: () => setDeleting(true)
                }
              ]}
            />
            <PlayButton size="md" instanceId={inst.id} />
          </div>
        </div>
      </section>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      <div key={tab} className="animate-pop">
        {tab === 'content' && <ContentTab inst={inst} />}
        {tab === 'worlds' && <WorldsTab inst={inst} />}
        {tab === 'screenshots' && <ScreenshotsTab inst={inst} />}
        {tab === 'files' && <FilesTab inst={inst} />}
        {tab === 'logs' && <LogsTab inst={inst} />}
        {tab === 'settings' && <InstanceSettingsTab inst={inst} onDelete={() => setDeleting(true)} />}
      </div>
      {deleting && <DeleteInstanceModal inst={inst} onClose={() => setDeleting(false)} />}
    </div>
  )
}
