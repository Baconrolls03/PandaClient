import { useMemo, useState } from 'react'
import { FileUp, Library as LibraryIcon, Plus } from 'lucide-react'
import { LOADERS, type Loader } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { InstanceCard } from '@/components/InstanceCard'
import { Button, Chip, Empty, SearchField, Select } from '@/components/ui'

type Sort = 'played' | 'name' | 'created' | 'version'

export function Library() {
  const { instances, openModal, attempt, navigate } = useStore()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('played')
  const [loader, setLoader] = useState<Loader | 'all'>('all')

  const list = useMemo(() => {
    let l = instances.filter((i) => (loader === 'all' || i.loader === loader) && `${i.name} ${i.mcVersion}`.toLowerCase().includes(q.toLowerCase()))
    if (sort === 'name') l = [...l].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'created') l = [...l].sort((a, b) => b.created.localeCompare(a.created))
    if (sort === 'version') l = [...l].sort((a, b) => b.mcVersion.localeCompare(a.mcVersion, undefined, { numeric: true }))
    return l
  }, [instances, q, sort, loader])

  const usedLoaders = LOADERS.filter((l) => instances.some((i) => i.loader === l.id))

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
          <div className="flex gap-1.5">
            <Chip active={loader === 'all'} onClick={() => setLoader('all')}>
              All
            </Chip>
            {usedLoaders.map((l) => (
              <Chip key={l.id} active={loader === l.id} onClick={() => setLoader(l.id)}>
                {l.name}
              </Chip>
            ))}
          </div>
          <Select
            value={sort}
            onChange={setSort}
            className="ml-auto"
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
          Create one for any Minecraft version and loader, or install a modpack from Modrinth.
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((inst) => (
            <InstanceCard key={inst.id} inst={inst} />
          ))}
        </div>
      )}
    </div>
  )
}
