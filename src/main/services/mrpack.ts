import { dialog } from 'electron'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { unzipSync, zipSync, type Zippable } from 'fflate'
import type { Instance, Loader } from '@shared/types'
import { download, getBuffer, pool } from './http'
import { createInstance, emitInstancesChanged, getInstance, removeInstance, saveIconBuffer } from './instances'
import { listContent } from './content'
import * as mr from './modrinth'
import { safeJoin } from './paths'
import { getSettings } from './settings'
import { type TaskHandle, withTask } from './tasks'

/** The .mrpack spec: https://support.modrinth.com/en/articles/8802351-modrinth-modpack-format-mrpack */
interface MrpackIndex {
  formatVersion: number
  game: string
  versionId: string
  name: string
  summary?: string
  files: {
    path: string
    hashes: { sha1: string; sha512?: string }
    env?: { client?: 'required' | 'optional' | 'unsupported'; server?: string }
    downloads: string[]
    fileSize?: number
  }[]
  dependencies: Partial<Record<'minecraft' | 'fabric-loader' | 'quilt-loader' | 'forge' | 'neoforge', string>>
}

// Download hosts the .mrpack spec allows.
const ALLOWED_HOSTS = ['cdn.modrinth.com', 'github.com', 'raw.githubusercontent.com', 'gitlab.com']
// Test runs point the API at a local fake server; allow its host too.
if (process.env['PANDA_MODRINTH_API']) ALLOWED_HOSTS.push(new URL(process.env['PANDA_MODRINTH_API']).host)

function loaderFromDeps(deps: MrpackIndex['dependencies']): { loader: Loader; version: string | null } {
  if (deps['fabric-loader']) return { loader: 'fabric', version: deps['fabric-loader'] }
  if (deps['quilt-loader']) return { loader: 'quilt', version: deps['quilt-loader'] }
  if (deps.neoforge) return { loader: 'neoforge', version: deps.neoforge }
  if (deps.forge) return { loader: 'forge', version: deps.forge }
  return { loader: 'vanilla', version: null }
}

async function installFromBuffer(
  buf: Uint8Array,
  task: TaskHandle,
  extra: { modpack?: Instance['modpack']; iconUrl?: string | null } = {}
): Promise<Instance> {
  task.update('Reading modpack', null)
  const zip = unzipSync(buf)
  const indexRaw = zip['modrinth.index.json']
  if (!indexRaw) throw new Error('Not a Modrinth modpack (modrinth.index.json missing)')
  const index = JSON.parse(new TextDecoder().decode(indexRaw)) as MrpackIndex
  if (index.game !== 'minecraft' || !index.dependencies.minecraft) throw new Error('Unsupported modpack')

  const { loader, version: loaderVersion } = loaderFromDeps(index.dependencies)
  // Validate every path before creating anything.
  const files = index.files.filter((f) => f.env?.client !== 'unsupported')
  for (const f of files) safeJoin('/instance', f.path)
  for (const name of Object.keys(zip)) {
    for (const prefix of ['overrides/', 'client-overrides/']) if (name.startsWith(prefix)) safeJoin('/instance', name.slice(prefix.length))
  }

  const inst = await createInstance({
    name: index.name,
    mcVersion: index.dependencies.minecraft,
    loader,
    loaderVersion,
    modpack: extra.modpack ?? null
  })

  try {
    let done = 0
    await pool(files, getSettings().maxDownloads, async (f) => {
      const url = f.downloads.find((u) => {
        try {
          return ALLOWED_HOSTS.includes(new URL(u).host)
        } catch {
          return false
        }
      })
      if (!url) throw new Error(`No allowed download for ${f.path}`)
      await download(url, safeJoin(inst.path, f.path), { sha1: f.hashes.sha1 })
      done++
      task.update(`Downloading files (${done}/${files.length})`, done / files.length)
    })

    // overrides/ first, then client-overrides/ on top.
    task.update('Applying overrides', null)
    for (const prefix of ['overrides/', 'client-overrides/']) {
      for (const [name, data] of Object.entries(zip)) {
        if (!name.startsWith(prefix) || name.endsWith('/')) continue
        const dest = safeJoin(inst.path, name.slice(prefix.length))
        await mkdir(dirname(dest), { recursive: true })
        await writeFile(dest, data)
      }
    }
  } catch (e) {
    // Don't leave a half-installed instance behind.
    await removeInstance(inst.id).catch(() => {})
    throw e
  }

  if (extra.iconUrl) {
    try {
      await saveIconBuffer(inst.id, await getBuffer(extra.iconUrl))
    } catch {
      /* icon is optional */
    }
  }
  emitInstancesChanged()
  return getInstance(inst.id)
}

export async function installModpack(projectId: string, versionId?: string): Promise<Instance> {
  const project = await mr.project(projectId)
  if (project.project_type !== 'modpack') throw new Error(`${project.title} is not a modpack`)
  return withTask(`Installing ${project.title}`, async (task) => {
    let version = versionId ? await mr.version(versionId) : undefined
    if (!version) {
      const all = (await mr.versions(project.id)).sort((a, b) => b.date_published.localeCompare(a.date_published))
      version = all.find((v) => v.version_type === 'release') ?? all[0]
    }
    if (!version) throw new Error(`${project.title} has no versions`)
    const file = version.files.find((f) => f.primary) ?? version.files[0]
    task.update(`Downloading ${project.title} ${version.version_number}`, 0)
    const buf = await getBuffer(file.url, (r, t) => t && task.update(`Downloading ${project.title} ${version.version_number}`, r / t))
    return installFromBuffer(buf, task, {
      modpack: { projectId: project.id, versionId: version.id, title: project.title },
      iconUrl: project.icon_url
    })
  })
}

export async function importMrpack(file: string): Promise<Instance> {
  return withTask('Importing modpack', async (task) => installFromBuffer(new Uint8Array(await readFile(file)), task))
}

/* ───────────── Export ───────────── */

async function addDir(zip: Zippable, root: string, dir: string, prefix: string): Promise<void> {
  if (!existsSync(dir)) return
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name)
    if (e.isDirectory()) await addDir(zip, root, abs, prefix)
    else zip[`${prefix}${relative(root, abs).split('\\').join('/')}`] = new Uint8Array(await readFile(abs))
  }
}

export async function exportMrpack(id: string): Promise<string | null> {
  const inst = await getInstance(id)
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: `${inst.name.replace(/[^\w .-]/g, '')}.mrpack`,
    filters: [{ name: 'Modrinth modpack', extensions: ['mrpack'] }]
  })
  if (canceled || !filePath) return null

  return withTask(`Exporting ${inst.name}`, async (task) => {
    task.update('Collecting content', null)
    const items = (await listContent(id)).filter((i) => i.enabled)
    const known = items.filter((i) => i.version)
    const versions = new Map((await mr.versionsByIds([...new Set(known.map((i) => i.version!.id))])).map((v) => [v.id, v]))

    const index: MrpackIndex = {
      formatVersion: 1,
      game: 'minecraft',
      versionId: '1.0.0',
      name: inst.name,
      summary: `Exported from PandaClient`,
      files: [],
      dependencies: { minecraft: inst.mcVersion }
    }
    const loaderKey = { fabric: 'fabric-loader', quilt: 'quilt-loader', forge: 'forge', neoforge: 'neoforge' } as const
    if (inst.loader !== 'vanilla' && inst.loaderVersion) index.dependencies[loaderKey[inst.loader]] = inst.loaderVersion

    const zip: Zippable = {}
    const folders = { mod: 'mods', resourcepack: 'resourcepacks', shader: 'shaderpacks', datapack: 'datapacks' } as const
    for (const item of items) {
      const rel = `${folders[item.type]}/${item.file}`
      const file = item.version && versions.get(item.version.id)?.files.find((f) => f.hashes.sha1 === item.sha1)
      if (file) {
        index.files.push({
          path: rel,
          hashes: file.hashes,
          env: { client: 'required', server: item.type === 'mod' ? 'required' : 'unsupported' },
          downloads: [file.url],
          fileSize: file.size
        })
      } else {
        // Not on Modrinth: ship the file itself.
        zip[`overrides/${rel}`] = new Uint8Array(await readFile(join(inst.path, rel)))
      }
    }
    await addDir(zip, inst.path, join(inst.path, 'config'), 'overrides/')
    for (const f of ['options.txt', 'servers.dat']) {
      const abs = join(inst.path, f)
      if (existsSync(abs) && (await stat(abs)).isFile()) zip[`overrides/${f}`] = new Uint8Array(await readFile(abs))
    }
    zip['modrinth.index.json'] = new TextEncoder().encode(JSON.stringify(index, null, 2))

    task.update('Writing file', null)
    await writeFile(filePath, zipSync(zip, { level: 6 }))
    return filePath
  })
}
