import { useEffect, useMemo, useState } from 'react'
import { Check, Download, Plus } from 'lucide-react'
import type { Instance, MrProject, MrVersion } from '@shared/types'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { LOADER_NAMES } from '@/lib/format'
import { Badge, Button, InstanceIcon, Modal, Select, Spinner } from '@/components/ui'

/** Can `project` be installed into `inst`? */
export function compatibility(project: MrProject, inst: Instance): { ok: boolean; reason?: string } {
  if (!project.game_versions.includes(inst.mcVersion)) return { ok: false, reason: `No ${inst.mcVersion} version` }
  if (project.project_type === 'mod' && !project.loaders.includes('fabric') && !project.loaders.includes('datapack')) {
    return { ok: false, reason: 'No Fabric version' }
  }
  return { ok: true }
}

export function InstallModal({ projectId, title, projectType }: { projectId: string; title: string; projectType: string }) {
  const { closeModal, instances, attempt, navigate, toast, update } = useStore()
  const [project, setProject] = useState<MrProject | null>(null)
  const [installed, setInstalled] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [versions, setVersions] = useState<MrVersion[] | null>(null)
  const [versionId, setVersionId] = useState('')
  const isPack = projectType === 'modpack'

  useEffect(() => {
    api.modrinth.project(projectId).then(setProject).catch(() => {})
    if (isPack) {
      api.modrinth.versions(projectId, { loaders: ['fabric'] }).then((v) => {
        setVersions(v)
        setVersionId(v[0]?.id ?? '')
      })
    } else {
      for (const inst of instances) {
        api.content.installedProjects(inst.id).then((ids) => setInstalled((s) => ({ ...s, [inst.id]: ids.includes(projectId) })))
      }
    }
  }, [projectId, isPack, instances])

  const sorted = useMemo(() => {
    if (!project) return []
    return [...instances].sort((a, b) => Number(compatibility(project, b).ok) - Number(compatibility(project, a).ok))
  }, [instances, project])

  async function install(inst: Instance) {
    setBusy((b) => ({ ...b, [inst.id]: true }))
    const ok = await attempt(async () => {
      await api.content.install(inst.id, projectId)
      return true
    }, `Installed ${title} into ${inst.name}`)
    setBusy((b) => ({ ...b, [inst.id]: false }))
    if (ok) setInstalled((s) => ({ ...s, [inst.id]: true }))
  }

  async function installPack() {
    closeModal()
    toast(`Installing ${title}. Progress is in the downloads panel.`)
    const inst = await attempt(() => api.modrinth.installModpack(projectId, versionId || undefined), `${title} is ready to play`)
    if (inst) {
      update({ selectedInstance: inst.id })
      navigate({ name: 'instance', id: inst.id })
    }
  }

  async function newInstanceFor() {
    if (!project) return
    const list = await api.versions.list()
    const releases = list.versions.filter((v) => v.type === 'release').map((v) => v.id)
    const fabricMc = releases.find((r) => project.game_versions.includes(r) && list.versions.find((v) => v.id === r)?.fabric)
    if (!fabricMc) return toast(`${title} doesn't support any version Fabric runs on`, 'error')
    closeModal()
    const inst = await attempt(() => api.instances.create({ name: `${title} ${fabricMc}`, mcVersion: fabricMc, loaderVersion: null, performancePack: false }))
    if (!inst) return
    navigate({ name: 'instance', id: inst.id })
    await attempt(() => api.content.install(inst.id, projectId), `Installed ${title} into ${inst.name}`)
  }

  if (isPack) {
    return (
      <Modal
        title={`Install ${title}`}
        onClose={closeModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={installPack} disabled={!versions?.length}>
              <Download size={16} /> Install modpack
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-muted">Modpacks install as a new instance with everything set up for you. Only Fabric versions are listed.</p>
        <label className="mb-1.5 block text-xs font-medium text-muted">Version</label>
        {versions == null ? (
          <Spinner />
        ) : versions.length === 0 ? (
          <p className="text-sm text-danger">This modpack has no Fabric version, so PandaClient can't run it.</p>
        ) : (
          <Select
            value={versionId}
            onChange={setVersionId}
            className="w-full"
            options={versions.slice(0, 80).map((v) => ({ value: v.id, label: `${v.version_number} · ${v.game_versions.join(', ')} · ${v.loaders.map((l) => LOADER_NAMES[l] ?? l).join(', ')}` }))}
          />
        )}
      </Modal>
    )
  }

  return (
    <Modal title={`Install ${title}`} onClose={closeModal}>
      {!project ? (
        <div className="grid place-items-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {sorted.map((inst) => {
            const c = compatibility(project, inst)
            const done = installed[inst.id]
            return (
              <div key={inst.id} className={`flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-raised ${c.ok ? '' : 'opacity-50'}`}>
                <InstanceIcon url={inst.iconUrl} preset={inst.iconPreset} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{inst.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    Fabric {inst.mcVersion}
                    {c.reason && <Badge tone={c.ok ? 'amber' : 'muted'}>{c.reason}</Badge>}
                  </div>
                </div>
                {done ? (
                  <Badge tone="mint">
                    <Check size={12} /> Installed
                  </Badge>
                ) : (
                  <Button size="sm" variant={c.ok ? 'primary' : 'secondary'} disabled={!c.ok} busy={busy[inst.id]} onClick={() => install(inst)}>
                    Install
                  </Button>
                )}
              </div>
            )
          })}
          <button onClick={newInstanceFor} className="mt-2 flex items-center gap-3 rounded-xl border border-dashed border-border p-3 text-sm font-medium text-mint transition-colors hover:bg-raised">
            <Plus size={18} /> New instance with {title}
          </button>
          {project.project_type === 'mod' && !project.loaders.includes('fabric') && (
            <p className="mt-2 text-xs text-muted">{title} isn't made for Fabric, so PandaClient can't install it.</p>
          )}
        </div>
      )}
    </Modal>
  )
}
