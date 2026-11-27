import { useEffect, useMemo, useState } from 'react'
import { Camera, Copy, FileUp, Gauge, ImagePlus, Package, Sword, Trees } from 'lucide-react'
import type { LoaderVersion, VersionList } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Button, InstanceIcon, Modal, Select, TextField } from '@/components/ui'
import { BUNDLES, type BundleId } from '@shared/bundles'
import { PresetIcon, randomPreset } from '@/lib/icons'
import { IconEditor, type IconChoice } from './IconEditor'
import { VersionSelect } from '@/components/VersionSelect'

const BUNDLE_ICON: Record<BundleId, typeof Sword> = { pvp: Sword, performance: Gauge, survival: Trees, recording: Camera, none: Package }

/** Pick a play style: a ready-made set of mods. */
export function BundlePicker({ value, onChange, compact }: { value: BundleId; onChange: (b: BundleId) => void; compact?: boolean }) {
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {BUNDLES.map((b) => {
        const Icon = BUNDLE_ICON[b.id]
        const on = value === b.id
        return (
          <button
            key={b.id}
            title={b.description}
            onClick={() => onChange(b.id)}
            className={`flex gap-3 rounded-2xl border text-left transition-colors ${compact ? 'items-center p-2' : 'items-start p-3'} ${on ? 'border-mint/60 bg-mint/10' : 'border-border bg-bg hover:bg-raised'} ${b.id === 'none' && !compact ? 'col-span-2' : ''}`}
          >
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${on ? 'bg-mint/20 text-mint' : 'bg-raised text-muted'}`}>
              <Icon size={17} />
            </span>
            <span>
              <span className="block text-sm font-semibold">{b.name}</span>
              {!compact && <span className="block text-xs leading-snug text-muted">{b.description}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function CreateInstanceModal() {
  const { closeModal, settings, update, attempt, navigate, toast, openModal, instances } = useStore()
  const [list, setList] = useState<VersionList | null>(null)
  const [name, setName] = useState('')
  const [mc, setMc] = useState('')
  const [loaderVersions, setLoaderVersions] = useState<LoaderVersion[] | null>(null)
  const [loaderVersion, setLoaderVersion] = useState('')
  const [bundle, setBundle] = useState<BundleId>('pvp')
  const [copyFrom, setCopyFrom] = useState('')
  const [icon, setIcon] = useState<IconChoice>(() => ({ kind: 'preset', preset: randomPreset() }))
  const [editingIcon, setEditingIcon] = useState(false)
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
        bundle,
        copyFrom: copyFrom || null,
        iconPreset: icon.kind === 'preset' ? icon.preset : null,
        iconFile: icon.kind === 'file' ? icon.file : null
      })
    )
    setBusy(false)
    if (inst) {
      update({ selectedInstance: inst.id })
      closeModal()
      navigate({ name: 'instance', id: inst.id })
      toast(copyFrom ? `Created ${inst.name}. Moving your mods over…` : `Created ${inst.name}`, 'success')
    }
  }

  return (
    <Modal
      title="New profile"
      onClose={closeModal}
      width="max-w-xl"
      allowOverflow
      footer={
        <>
          <Button variant="ghost" onClick={() => openModal({ kind: 'import' })} className="mr-auto">
            <FileUp size={16} /> Import from another launcher
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
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setEditingIcon(true)} className="group relative" title="Customise icon">
            {icon.kind === 'preset' ? (
              <PresetIcon preset={icon.preset} size={64} />
            ) : (
              <InstanceIcon url={null} size={64} className={icon.kind === 'file' ? 'ring-2 ring-mint' : ''} />
            )}
            <span className="absolute inset-0 grid place-items-center rounded-xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <ImagePlus size={20} color="#fff" />
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

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Play style</label>
          <BundlePicker value={bundle} onChange={setBundle} compact />
        </div>

        {instances.length > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-bg p-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue/15 text-blue">
              <Copy size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Move my mods from another profile</div>
              <div className="truncate text-xs text-muted" title="Any mods not out for this version yet are left out, and you'll see which.">Updated to {mc || 'this version'} automatically</div>
            </div>
            <Select
              value={copyFrom}
              onChange={setCopyFrom}
              className="w-44"
              options={[{ value: '', label: "Don't move" }, ...instances.map((i) => ({ value: i.id, label: `${i.name} (${i.mcVersion})` }))]}
            />
          </div>
        )}
      </div>
      {editingIcon && (
        <IconEditor
          initial={icon}
          onClose={() => setEditingIcon(false)}
          onSave={(c) => {
            setIcon(c)
            setEditingIcon(false)
          }}
        />
      )}
    </Modal>
  )
}
