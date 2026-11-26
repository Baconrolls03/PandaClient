import { useEffect, useMemo, useState } from 'react'
import { FileUp, ImagePlus, Zap } from 'lucide-react'
import type { LoaderVersion, VersionList } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Button, InstanceIcon, Modal, Select, TextField, Toggle } from '@/components/ui'
import { VersionSelect } from '@/components/VersionSelect'

export function CreateInstanceModal() {
  const { closeModal, settings, update, attempt, navigate, toast } = useStore()
  const [list, setList] = useState<VersionList | null>(null)
  const [name, setName] = useState('')
  const [mc, setMc] = useState('')
  const [loaderVersions, setLoaderVersions] = useState<LoaderVersion[] | null>(null)
  const [loaderVersion, setLoaderVersion] = useState('')
  const [perfPack, setPerfPack] = useState(true)
  const [iconFile, setIconFile] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.versions.list().then((l) => {
      setList(l)
      setMc(l.versions.find((v) => v.type === 'release' && v.fabric)?.id ?? l.latestRelease)
    })
  }, [])

  useEffect(() => {
    setLoaderVersions(null)
    setLoaderVersion('')
    if (!mc) return
    let cancelled = false
    api.versions
      .fabric(mc)
      .then((v) => !cancelled && setLoaderVersions(v))
      .catch(() => !cancelled && setLoaderVersions([]))
    return () => {
      cancelled = true
    }
  }, [mc])

  const versions = useMemo(() => (list?.versions ?? []).filter((v) => v.fabric), [list])
  const noLoader = loaderVersions != null && loaderVersions.length === 0
  const placeholder = `Fabric ${mc}`

  async function create() {
    setBusy(true)
    const inst = await attempt(() =>
      api.instances.create({
        name: name.trim() || placeholder,
        mcVersion: mc,
        loaderVersion: loaderVersion || null,
        performancePack: perfPack,
        iconFile
      })
    )
    setBusy(false)
    if (inst) {
      update({ selectedInstance: inst.id })
      closeModal()
      navigate({ name: 'instance', id: inst.id })
      toast(`Created ${inst.name}`, 'success')
    }
  }

  async function importPack() {
    const file = await api.settings.pickFile('mrpack')
    if (!file) return
    closeModal()
    const inst = await attempt(() => api.instances.importMrpack(file), 'Modpack imported')
    if (inst) navigate({ name: 'instance', id: inst.id })
  }

  return (
    <Modal
      title="New instance"
      onClose={closeModal}
      width="max-w-xl"
      allowOverflow
      footer={
        <>
          <Button variant="ghost" onClick={importPack} className="mr-auto">
            <FileUp size={16} /> Import .mrpack
          </Button>
          <Button variant="ghost" onClick={closeModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={create} busy={busy} disabled={!mc || noLoader || loaderVersions == null}>
            Create
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={async () => setIconFile((await api.settings.pickFile('image')) ?? iconFile)}
            className="group relative"
            title={iconFile ?? 'Choose icon'}
          >
            <InstanceIcon url={null} size={64} className={iconFile ? 'ring-2 ring-mint' : ''} />
            <span className="absolute inset-0 grid place-items-center rounded-xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <ImagePlus size={20} />
            </span>
          </button>
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-muted">Name</label>
            <TextField value={name} onChange={setName} placeholder={placeholder} className="w-full" autoFocus />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Minecraft version</label>
            <VersionSelect
              versions={versions}
              value={mc}
              onChange={setMc}
              showSnapshots={settings.showSnapshots}
              onShowSnapshots={(v) => update({ showSnapshots: v })}
              offline={list?.offline}
              loading={!list}
              showBadges={false}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Fabric Loader</label>
            {loaderVersions == null ? (
              <div className="flex h-14 items-center rounded-2xl border border-border bg-bg px-4 text-sm text-muted">Loading…</div>
            ) : noLoader ? (
              <div className="flex h-14 items-center rounded-2xl border border-danger/40 bg-danger/5 px-4 text-sm text-danger">No Fabric for {mc}</div>
            ) : (
              <Select
                value={loaderVersion}
                onChange={setLoaderVersion}
                className="h-14 w-full rounded-2xl"
                options={[
                  { value: '', label: `Latest stable (${(loaderVersions.find((l) => l.stable) ?? loaderVersions[0]).version})` },
                  ...loaderVersions.slice(0, 50).map((l) => ({ value: l.version, label: `${l.version}${l.stable ? '' : ' (beta)'}` }))
                ]}
              />
            )}
          </div>
        </div>

        {(
          <div className="flex items-center gap-4 rounded-2xl border border-mint/25 bg-mint/5 p-4">
            <div className="grid size-10 place-items-center rounded-xl bg-mint/15 text-mint">
              <Zap size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">PandaClient performance pack</div>
              <div className="text-xs text-muted">Fabric API, Sodium, Lithium and Iris from Modrinth</div>
            </div>
            <Toggle label="Performance pack" checked={perfPack} onChange={setPerfPack} />
          </div>
        )}
      </div>
    </Modal>
  )
}
