import { shell } from 'electron'
import { existsSync } from 'node:fs'
import { copyFile, cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CreateInstanceInput, Instance } from '@shared/types'
import { gameDir, localUrl, safeJoin } from './paths'

const META = 'instance.json'
type Stored = Omit<Instance, 'iconUrl' | 'path'>

const listeners = new Set<() => void>()
export const onInstancesChanged = (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn))
export const emitInstancesChanged = () => listeners.forEach((l) => l())

export const instancesRoot = () => join(gameDir(), 'instances')

export function instanceDir(id: string): string {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(id)) throw new Error(`Invalid instance id: ${id}`)
  return safeJoin(instancesRoot(), id)
}

async function hydrate(id: string, stored: Stored): Promise<Instance> {
  const dir = instanceDir(id)
  const icon = join(dir, 'icon.png')
  let iconUrl: string | null = null
  try {
    iconUrl = localUrl(icon, (await stat(icon)).mtimeMs)
  } catch {
    /* no icon */
  }
  return { ...stored, id, iconUrl, path: dir }
}

export async function getInstance(id: string): Promise<Instance> {
  const raw = await readFile(join(instanceDir(id), META), 'utf8').catch(() => {
    throw new Error('Instance not found')
  })
  return hydrate(id, JSON.parse(raw) as Stored)
}

export async function listInstances(): Promise<Instance[]> {
  const root = instancesRoot()
  if (!existsSync(root)) return []
  const out: Instance[] = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    try {
      out.push(await getInstance(entry.name))
    } catch {
      /* not an instance folder */
    }
  }
  // Most recently played first, then newest.
  return out.sort((a, b) => (b.lastPlayed ?? b.created).localeCompare(a.lastPlayed ?? a.created))
}

async function save(inst: Instance): Promise<Instance> {
  const { iconUrl: _i, path: _p, ...stored } = inst
  await writeFile(join(instanceDir(inst.id), META), JSON.stringify(stored, null, 2))
  emitInstancesChanged()
  return hydrate(inst.id, stored)
}

async function uniqueId(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'instance'
  let id = base
  for (let n = 2; existsSync(join(instancesRoot(), id)); n++) id = `${base}-${n}`
  return id
}

/** Create the folder + metadata. Content (perf pack, modpack files) is added by the caller. */
export async function createInstance(input: Omit<CreateInstanceInput, 'performancePack'> & { modpack?: Instance['modpack'] }): Promise<Instance> {
  const name = input.name.trim() || `Fabric ${input.mcVersion}`
  const id = await uniqueId(name)
  const dir = join(instancesRoot(), id)
  await mkdir(dir, { recursive: true })
  for (const sub of ['mods', 'resourcepacks', 'shaderpacks', 'saves', 'screenshots']) await mkdir(join(dir, sub), { recursive: true })
  if (input.iconFile) await copyFile(input.iconFile, join(dir, 'icon.png')).catch(() => {})
  return save({
    id,
    name,
    mcVersion: input.mcVersion,
    loader: 'fabric',
    loaderVersion: input.loaderVersion,
    created: new Date().toISOString(),
    lastPlayed: null,
    iconUrl: null,
    ramMb: null,
    javaPath: null,
    jvmArgs: '',
    modpack: input.modpack ?? null,
    path: dir
  })
}

export async function updateInstance(id: string, patch: Partial<Stored>): Promise<Instance> {
  const inst = await getInstance(id)
  const allowed: (keyof Stored)[] = ['name', 'ramMb', 'javaPath', 'jvmArgs', 'lastPlayed', 'loaderVersion']
  const clean: Partial<Stored> = {}
  for (const k of allowed) if (k in patch) (clean as Record<string, unknown>)[k] = patch[k]
  if (typeof clean.name === 'string') clean.name = clean.name.trim() || inst.name
  return save({ ...inst, ...clean })
}

export async function setInstanceIcon(id: string, file: string | null): Promise<Instance> {
  const icon = join(instanceDir(id), 'icon.png')
  if (file) await copyFile(file, icon)
  else await rm(icon, { force: true })
  emitInstancesChanged()
  return getInstance(id)
}

export async function saveIconBuffer(id: string, buf: Uint8Array): Promise<void> {
  await writeFile(join(instanceDir(id), 'icon.png'), buf)
}

export async function duplicateInstance(id: string): Promise<Instance> {
  const src = await getInstance(id)
  const newId = await uniqueId(`${src.name} copy`)
  await cp(src.path, join(instancesRoot(), newId), { recursive: true })
  const copy = { ...src, id: newId, name: `${src.name} (copy)`, created: new Date().toISOString(), lastPlayed: null }
  return save({ ...copy, path: join(instancesRoot(), newId) })
}

export async function removeInstance(id: string): Promise<void> {
  const dir = instanceDir(id)
  // Recycle bin / Trash first so a mis-click is recoverable.
  await shell.trashItem(dir).catch(() => rm(dir, { recursive: true, force: true }))
  emitInstancesChanged()
}
