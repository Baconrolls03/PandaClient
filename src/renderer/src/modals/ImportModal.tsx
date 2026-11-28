import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, ChevronDown, FileArchive, FolderSearch, Loader2, PackageOpen, RefreshCw, Sparkles } from 'lucide-react'
import type { ImportInput, ImportResult, ImportSource, LauncherId, VersionList } from '@shared/types'
import { api } from '@/lib/api'
import { PANDA_VERSIONS } from '@shared/bundles'
import { useStore } from '@/lib/store'
import { errorMessage, LOADER_NAMES } from '@/lib/format'
import { randomPreset } from '@/lib/icons'
import { Button, Modal, Spinner, TextField } from '@/components/ui'
import { VersionSelect } from '@/components/VersionSelect'

const LAUNCHERS: Record<LauncherId, { name: string; letter: string; color: string }> = {
  lunar: { name: 'Lunar Client', letter: 'L', color: '#3B82F6' },
  feather: { name: 'Feather', letter: 'F', color: '#F59E0B' },
  dawn: { name: 'Dawn', letter: 'D', color: '#F97316' },
  modrinth: { name: 'Modrinth App', letter: 'M', color: '#1BD96A' },
  curseforge: { name: 'CurseForge', letter: 'C', color: '#F16436' },
  prism: { name: 'Prism Launcher', letter: 'P', color: '#A78BFA' },
  minecraft: { name: 'Minecraft Launcher', letter: 'M', color: '#64748B' },
  folder: { name: 'Folder', letter: '…', color: '#64748B' }
}
const ORDER: LauncherId[] = ['lunar', 'feather', 'dawn', 'modrinth', 'curseforge', 'prism', 'minecraft', 'folder']

function LauncherTile({ id, size = 40 }: { id: LauncherId; size?: number }) {
  const l = LAUNCHERS[id]
  return (
    <span className="grid shrink-0 place-items-center rounded-xl font-bold text-white" style={{ width: size, height: size, background: l.color, fontSize: size * 0.42 }}>
      {l.letter}
    </span>
  )
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
function summary(c: ImportSource['counts']): string {
  return [c.mods && plural(c.mods, 'mod'), c.resourcepacks && plural(c.resourcepacks, 'pack'), c.shaderpacks && plural(c.shaderpacks, 'shader'), c.saves && plural(c.saves, 'world')].filter(Boolean).join(' · ')
}
const notFabric = (s: ImportSource) => s.loader && s.loader !== 'fabric'

type Step = { kind: 'pick' } | { kind: 'configure'; source: ImportSource } | { kind: 'running' } | { kind: 'done'; result: ImportResult; name: string }

export function ImportModal() {
  const { closeModal, navigate, attempt, update, toast, settings } = useStore()
  const [step, setStep] = useState<Step>({ kind: 'pick' })
  const [sources, setSources] = useState<ImportSource[] | null>(null)
  const [versions, setVersions] = useState<VersionList | null>(null)
  const [name, setName] = useState('')
  const [mc, setMc] = useState('')
  const [detecting, setDetecting] = useState(false)
  const [fromVersion, setFromVersion] = useState<string | null>(null)
  const [include, setInclude] = useState<ImportInput['include']>({ mods: true, resourcepacks: true, shaderpacks: true, saves: true, config: true, options: true, servers: true, screenshots: false })
  const [showSkipped, setShowSkipped] = useState(false)

  const scan = () => {
    setSources(null)
    api.importer.scan().then(setSources).catch(() => setSources([]))
  }
  useEffect(() => {
    scan()
    api.versions.list().then(setVersions).catch(() => {})
  }, [])

  const fabricVersions = useMemo(() => (versions?.versions ?? []).filter((v) => v.fabric), [versions])
  const grouped = useMemo(() => ORDER.map((id) => [id, (sources ?? []).filter((s) => s.launcher === id)] as const).filter(([, l]) => l.length), [sources])

  async function choose(source: ImportSource) {
    setStep({ kind: 'configure', source })
    setName(source.name.replace(/^(Lunar Client|Feather|Dawn) · /, '').replace(/ \/ /g, ' ') || 'Imported')
    // PandaClient (its menu, lobby and HUD) runs on PANDA_VERSIONS: keep the mods' version when it's one of
    // them, otherwise move the profile to the newest one and update the mods to it.
    const pick = (v: string | null) => (v && PANDA_VERSIONS.includes(v) ? v : PANDA_VERSIONS[0])
    setFromVersion(source.mcVersion)
    setMc(pick(source.mcVersion))
    if (source.counts.mods && (!source.mcVersion || !PANDA_VERSIONS.includes(source.mcVersion))) {
      setDetecting(true)
      const detected = await api.importer.detectVersion(source.path).catch(() => null)
      setDetecting(false)
      if (detected) {
        setFromVersion(detected)
        setMc(pick(detected))
      }
    }
  }

  async function browse() {
    const path = await api.settings.pickDirectory()
    if (!path) return
    const s = await attempt(() => api.importer.describeFolder(path))
    if (s) void choose(s)
  }

  async function mrpack() {
    const file = await api.settings.pickFile('mrpack')
    if (!file) return
    closeModal()
    const inst = await attempt(() => api.instances.importMrpack(file), 'Modpack imported')
    if (inst) navigate({ name: 'instance', id: inst.id })
  }

  async function run(source: ImportSource) {
    setStep({ kind: 'running' })
    try {
      const result = await api.importer.run({ path: source.path, name: name.trim() || source.name, mcVersion: mc, fromVersion, include, iconPreset: randomPreset() })
      update({ selectedInstance: result.instanceId })
      setStep({ kind: 'done', result, name: name.trim() || source.name })
    } catch (e) {
      toast(errorMessage(e), 'error')
      setStep({ kind: 'configure', source })
    }
  }

  /* ── Step: pick a source ── */
  if (step.kind === 'pick')
    return (
      <Modal
        title="Import"
        onClose={closeModal}
        width="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={mrpack} className="mr-auto">
              <FileArchive size={16} /> .mrpack file
            </Button>
            <Button onClick={browse}>
              <FolderSearch size={16} /> Browse for a folder
            </Button>
          </>
        }
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <p className="text-sm text-muted">Bring your mods, resource packs, shaders, worlds and settings over from other launchers. Nothing is moved: your other launcher keeps working.</p>
          <Button size="sm" variant="ghost" onClick={scan} title="Scan again">
            <RefreshCw size={14} />
          </Button>
        </div>
        {sources == null ? (
          <div className="flex items-center justify-center gap-3 py-14 text-sm text-muted">
            <Spinner /> Looking for Lunar, Feather, Dawn, Modrinth, CurseForge, Prism and Minecraft…
          </div>
        ) : sources.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <PackageOpen size={26} className="mx-auto text-muted" />
            <p className="mt-3 font-semibold">No other launchers found</p>
            <p className="mt-1 text-sm text-muted">Use “Browse for a folder” and pick the folder that holds your mods (in Lunar, the 📁 button on the Mods screen opens it).</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map(([id, list]) => (
              <section key={id}>
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{LAUNCHERS[id].name}</h3>
                <div className="flex flex-col gap-1.5">
                  {list.map((s) => (
                    <button key={s.id} onClick={() => choose(s)} className="flex items-center gap-3 rounded-xl border border-border bg-bg/40 p-2.5 text-left transition-all hover:-translate-y-px hover:bg-raised">
                      <LauncherTile id={s.launcher} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{s.name}</div>
                        <div className="truncate text-xs text-muted">
                          {[s.mcVersion && `Minecraft ${s.mcVersion}`, s.loader && (LOADER_NAMES[s.loader] ?? s.loader), summary(s.counts)].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      {notFabric(s) && (
                        <span className="flex shrink-0 items-center gap-1 rounded-md bg-amber-400/12 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300" title="Mods built for other loaders can't run on Fabric">
                          <AlertTriangle size={11} /> Not Fabric
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Modal>
    )

  /* ── Step: configure ── */
  if (step.kind === 'configure') {
    const s = step.source
    const rows: { key: keyof ImportInput['include']; label: string; note?: string; count?: number }[] = [
      { key: 'mods', label: 'Mods', note: 'Fabric mods only', count: s.counts.mods },
      { key: 'resourcepacks', label: 'Resource packs', count: s.counts.resourcepacks },
      { key: 'shaderpacks', label: 'Shaders', count: s.counts.shaderpacks },
      { key: 'saves', label: 'Worlds', count: s.counts.saves },
      { key: 'config', label: 'Mod settings', note: 'the config folder' },
      { key: 'options', label: 'Game options & keybinds', note: 'options.txt' },
      { key: 'servers', label: 'Server list' },
      { key: 'screenshots', label: 'Screenshots' }
    ]
    return (
      <Modal
        title="Import"
        onClose={closeModal}
        width="max-w-xl"
        allowOverflow
        footer={
          <>
            <Button variant="ghost" onClick={() => setStep({ kind: 'pick' })} className="mr-auto">
              <ArrowLeft size={16} /> Back
            </Button>
            <Button variant="primary" disabled={!mc || detecting} onClick={() => run(s)}>
              Import
            </Button>
          </>
        }
      >
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-bg/40 p-3">
          <LauncherTile id={s.launcher} size={44} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{s.name}</div>
            <div className="truncate font-mono text-[11px] text-muted">{s.path}</div>
          </div>
        </div>
        {notFabric(s) && (
          <p className="mb-4 flex gap-2 rounded-xl border border-amber-400/30 bg-amber-400/8 p-3 text-[13px] text-amber-200">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> This is a {LOADER_NAMES[s.loader!] ?? s.loader} instance. PandaClient runs Fabric, so its mods will be skipped. Packs, shaders, worlds and settings still come across, and you can add the Fabric versions of your mods from Discover.
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Name</label>
            <TextField value={name} onChange={setName} className="h-14 w-full rounded-2xl" />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
              Minecraft version
              {detecting && (
                <span className="flex items-center gap-1 text-mint">
                  <Loader2 size={11} className="animate-spin" /> checking your mods
                </span>
              )}
            </label>
            <VersionSelect versions={fabricVersions} value={mc} onChange={setMc} showSnapshots={settings.showSnapshots} onShowSnapshots={(v) => update({ showSnapshots: v })} loading={!versions} showBadges={false} className="w-full" />
          </div>
        </div>
        {!PANDA_VERSIONS.includes(mc) ? (
          <p className="mt-2 flex gap-2 rounded-xl border border-amber-400/30 bg-amber-400/8 p-2.5 text-xs text-amber-200">
            <AlertTriangle size={14} className="mt-px shrink-0" /> PandaClient (its menu, lobby and HUD) only runs on Minecraft {PANDA_VERSIONS[PANDA_VERSIONS.length - 1]} to {PANDA_VERSIONS[0]}. Pick one of those to use it with this profile.
          </p>
        ) : fromVersion && fromVersion !== mc && include.mods ? (
          <p className="mt-2 text-xs text-muted">Your mods are for Minecraft {fromVersion}. PandaClient gets each one for {mc} from Modrinth; any that don't have a {mc} version yet are listed after importing.</p>
        ) : (
          <p className="mt-2 text-xs text-muted">PandaClient is added to this profile automatically.</p>
        )}
        <h3 className="mb-2 mt-5 text-sm font-semibold">What to bring</h3>
        <div className="grid grid-cols-2 gap-2">
          {rows.map((r) => {
            const on = include[r.key]
            const empty = r.count === 0
            return (
              <button
                key={r.key}
                disabled={empty}
                onClick={() => setInclude({ ...include, [r.key]: !on })}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-40 ${on && !empty ? 'border-mint/50 bg-mint/5' : 'border-border hover:bg-raised'}`}
              >
                <span className={`grid size-5 shrink-0 place-items-center rounded-md border ${on && !empty ? 'border-mint bg-mint text-ink' : 'border-border'}`}>{on && !empty && <Check size={13} />}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {r.label}
                    {r.count != null && <span className="ml-1.5 text-xs text-muted">{r.count}</span>}
                  </span>
                  {r.note && <span className="block truncate text-[11px] text-muted">{r.note}</span>}
                </span>
              </button>
            )
          })}
        </div>
      </Modal>
    )
  }

  /* ── Step: running ── */
  if (step.kind === 'running')
    return (
      <Modal title="Import" onClose={closeModal}>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 size={28} className="animate-spin text-mint" />
          <p className="font-semibold">Importing…</p>
          <p className="text-sm text-muted">Copying your files. Big worlds can take a moment.</p>
        </div>
      </Modal>
    )

  /* ── Step: done ── */
  const r = step.result
  return (
    <Modal
      title="Imported"
      onClose={closeModal}
      footer={
        <>
          <Button variant="ghost" onClick={closeModal}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              closeModal()
              navigate({ name: 'instance', id: r.instanceId })
            }}
          >
            Open {step.name}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center pb-2 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-mint/15 text-mint">
          <Sparkles size={22} />
        </span>
        <p className="mt-3 font-semibold">{step.name} is ready</p>
        <p className="mt-1 text-sm text-muted">
          {[plural(r.mods, 'mod'), plural(r.resourcepacks, 'resource pack'), plural(r.shaderpacks, 'shader'), plural(r.saves, 'world'), ...r.other].join(' · ')}
        </p>
      </div>
      {r.skipped.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5">
          <button onClick={() => setShowSkipped(!showSkipped)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-amber-200">
            <AlertTriangle size={15} /> {plural(r.skipped.length, 'mod')} skipped (not Fabric)
            <ChevronDown size={15} className={`ml-auto transition-transform ${showSkipped ? 'rotate-180' : ''}`} />
          </button>
          {showSkipped && (
            <ul className="max-h-48 overflow-y-auto border-t border-amber-400/20 px-3 py-2 text-xs">
              {r.skipped.map((s) => (
                <li key={s.file} className="flex justify-between gap-3 py-0.5">
                  <span className="truncate font-mono">{s.file}</span>
                  <span className="shrink-0 text-muted">{s.reason}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-amber-400/20 px-3 py-2 text-xs text-muted">Search for them in Discover: many have Fabric versions.</p>
        </div>
      )}
    </Modal>
  )
}
