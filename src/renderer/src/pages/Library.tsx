import { useMemo, useState } from 'react'
import { FileUp, LayoutGrid, Library as LibraryIcon, List, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { InstanceCard } from '@/components/InstanceCard'
import { Button, Empty, InstanceIcon, SearchField, Select } from '@/components/ui'
import { playtime, timeAgo } from '@/lib/format'

type Sort = 'played' | 'name' | 'created' | 'version'

export function Library() {
  const { instances, openModal, attempt, navigate, settings, update, launch, running } = useStore()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('played')

  const list = useMemo(() => {
    let l = instances.filter((i) => `${i.name} ${i.mcVersion}`.toLowerCase().includes(q.toLowerCase()))
    if (sort === 'name') l = [...l].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'created') l = [...l].sort((a, b) => b.created.localeCompare(a.created))
    if (sort === 'version') l = [...l].sort((a, b) => b.mcVersion.localeCompare(a.mcVersion, undefined, { numeric: true }))
    return l
  }, [instances, q, sort])

  async function importPack() {
    const file = await api.settings.pickFile('mrpack')
    if (!file) return
    const inst = await attempt(() => api.instances.importMrpack(file), 'Modpack imported')
    if (inst) navigate({ name: 'instance', id: inst.id })
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Library</h1>
          <p className="mt-1 text-sm text-muted">
            {instances.length} instance{instances.length === 1 ? '' : 's'}. Each one keeps its own mods, worlds and settings.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={importPack}>
            <FileUp size={16} /> Import .mrpack
          </Button>
          <Button variant="primary" onClick={() => openModal({ kind: 'create-instance' })}>
            <Plus size={16} /> New instance
          </Button>
        </div>
      </div>

      {instances.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <SearchField value={q} onChange={setQ} placeholder="Search instances" className="w-72" />
          <div className="ml-auto flex gap-1 rounded-xl border border-border bg-surface p-1">
            <button aria-label="Grid" onClick={() => update({ compactLibrary: false })} className={`grid size-8 place-items-center rounded-lg ${settings.compactLibrary ? 'text-muted' : 'bg-raised text-text'}`}>
              <LayoutGrid size={15} />
            </button>
            <button aria-label="List" onClick={() => update({ compactLibrary: true })} className={`grid size-8 place-items-center rounded-lg ${settings.compactLibrary ? 'bg-raised text-text' : 'text-muted'}`}>
              <List size={15} />
            </button>
          </div>
          <Select
            value={sort}
            onChange={setSort}
            options={[
              { value: 'played', label: 'Last played' },
              { value: 'name', label: 'Name' },
              { value: 'created', label: 'Date created' },
              { value: 'version', label: 'Game version' }
            ]}
          />
        </div>
      )}

      {instances.length === 0 ? (
        <Empty
          icon={<LibraryIcon size={22} />}
          title="No instances yet"
          action={
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => openModal({ kind: 'create-instance' })}>
                <Plus size={16} /> New instance
              </Button>
              <Button onClick={() => navigate({ name: 'discover', type: 'modpack' })}>Browse modpacks</Button>
            </div>
          }
        >
          Create one for any Minecraft version Fabric supports, or install a Fabric modpack from Modrinth.
        </Empty>
      ) : (
        settings.compactLibrary ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
            {list.map((inst) => (
              <div key={inst.id} onClick={() => navigate({ name: 'instance', id: inst.id })} className="flex cursor-pointer items-center gap-4 border-b border-border px-4 py-2.5 transition-colors last:border-0 hover:bg-raised">
                <InstanceIcon url={inst.iconUrl} preset={inst.iconPreset} size={36} className="rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{inst.name}</div>
                  <div className="text-xs text-muted">Fabric {inst.mcVersion}</div>
                </div>
                {settings.showPlayTime && <span className="w-20 text-right text-xs text-muted">{inst.playtimeSec ? playtime(inst.playtimeSec) : '–'}</span>}
                <span className="w-28 text-right text-xs text-muted">{inst.lastPlayed ? timeAgo(inst.lastPlayed) : 'Never played'}</span>
                <Button
                  size="sm"
                  variant={running.has(inst.id) ? 'danger' : 'primary'}
                  onClick={() => (running.has(inst.id) ? api.game.stop(inst.id) : launch(inst.id))}
                >
                  {running.has(inst.id) ? 'Stop' : 'Play'}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {list.map((inst) => (
              <InstanceCard key={inst.id} inst={inst} />
            ))}
          </div>
        )
      )}
    </div>
  )
}
