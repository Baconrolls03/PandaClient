import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { CONTENT_FOLDERS, type ContentItem, type ContentType, type Instance, type MrProject, type MrVersion } from '@shared/types'
import { download, sha1File } from './http'
import { getInstance, instanceDir } from './instances'
import { MOD_LOADERS } from './loaders'
import * as mr from './modrinth'
import { type TaskHandle, withTask } from './tasks'

/* ───────────── Per-instance metadata cache (.panda/content.json) ───────────── */

interface Meta {
  project: NonNullable<ContentItem['project']>
  version: NonNullable<ContentItem['version']>
}
interface Cache {
  /** relative path → hash info, so files are only re-hashed when they change */
  files: Record<string, { size: number; mtime: number; sha1: string }>
  /** sha1 → Modrinth info; null = not on Modrinth (re-checked after a day) */
  meta: Record<string, Meta | null>
  unknownCheckedAt: Record<string, number>
  updates: Record<string, { versionId: string; number: string }>
}

const cachePath = (id: string) => join(instanceDir(id), '.panda', 'content.json')

async function readCache(id: string): Promise<Cache> {
  try {
    return { files: {}, meta: {}, unknownCheckedAt: {}, updates: {}, ...JSON.parse(await readFile(cachePath(id), 'utf8')) }
  } catch {
    return { files: {}, meta: {}, unknownCheckedAt: {}, updates: {} }
  }
}

async function writeCache(id: string, cache: Cache): Promise<void> {
  await mkdir(join(instanceDir(id), '.panda'), { recursive: true })
  await writeFile(cachePath(id), JSON.stringify(cache))
}

// Serialise operations per instance so concurrent installs don't clobber the cache.
const locks = new Map<string, Promise<unknown>>()
function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(id) ?? Promise.resolve()
  const next = prev.catch(() => {}).then(fn)
  locks.set(id, next)
  return next
}

/* ───────────── Scanning ───────────── */

const EXT: Record<ContentType, RegExp> = {
  mod: /\.jar(\.disabled)?$/i,
  resourcepack: /\.zip(\.disabled)?$/i,
  shader: /\.zip(\.disabled)?$/i,
  datapack: /\.zip(\.disabled)?$/i
}

interface ScannedFile {
  type: ContentType
  file: string
  rel: string
  abs: string
  size: number
  mtime: number
}

async function scanFiles(inst: Instance): Promise<ScannedFile[]> {
  const out: ScannedFile[] = []
  for (const type of Object.keys(CONTENT_FOLDERS) as ContentType[]) {
    const dir = join(inst.path, CONTENT_FOLDERS[type])
    if (!existsSync(dir)) continue
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (!e.isFile() || !EXT[type].test(e.name)) continue
      const abs = join(dir, e.name)
      const s = await stat(abs)
      out.push({ type, file: e.name, rel: `${CONTENT_FOLDERS[type]}/${e.name}`, abs, size: s.size, mtime: s.mtimeMs })
    }
  }
  return out
}

function toMeta(project: MrProject, version: MrVersion): Meta {
  return {
    project: { id: project.id, slug: project.slug, title: project.title, iconUrl: project.icon_url },
    version: { id: version.id, number: version.version_number }
  }
}

async function scan(inst: Instance): Promise<ContentItem[]> {
  const cache = await readCache(inst.id)
  const files = await scanFiles(inst)

  // Hash new / changed files.
  const seen = new Set<string>()
  for (const f of files) {
    seen.add(f.rel)
    const c = cache.files[f.rel]
    if (!c || c.size !== f.size || c.mtime !== f.mtime) cache.files[f.rel] = { size: f.size, mtime: f.mtime, sha1: await sha1File(f.abs) }
  }
  for (const rel of Object.keys(cache.files)) if (!seen.has(rel)) delete cache.files[rel]

  // Look up hashes we haven't identified yet (and unknown ones once a day).
  const dayAgo = Date.now() - 86_400_000
  const lookup = [
    ...new Set(
      files
        .map((f) => cache.files[f.rel].sha1)
        .filter((h) => !(h in cache.meta) || (cache.meta[h] === null && (cache.unknownCheckedAt[h] ?? 0) < dayAgo))
    )
  ]
  if (lookup.length) {
    try {
      const byHash = await mr.versionsFromHashes(lookup)
      const projects = await mr.projects([...new Set(Object.values(byHash).map((v) => v.project_id))])
      const pById = new Map(projects.map((p) => [p.id, p]))
      for (const h of lookup) {
        const v = byHash[h]
        const p = v && pById.get(v.project_id)
        if (v && p) {
          cache.meta[h] = toMeta(p, v)
          delete cache.unknownCheckedAt[h]
        } else {
          cache.meta[h] = null
          cache.unknownCheckedAt[h] = Date.now()
        }
      }
    } catch {
      // Offline: show files without Modrinth info.
    }
  }
  await writeCache(inst.id, cache)

  return files
    .map((f): ContentItem => {
      const sha1 = cache.files[f.rel].sha1
      const meta = cache.meta[sha1] ?? null
      return {
        file: f.file,
        type: f.type,
        enabled: !f.file.endsWith('.disabled'),
        size: f.size,
        sha1,
        project: meta?.project ?? null,
        version: meta?.version ?? null,
        update: cache.updates[sha1] ?? null
      }
    })
    .sort((a, b) => (a.project?.title ?? a.file).localeCompare(b.project?.title ?? b.file, undefined, { sensitivity: 'base' }))
}

export async function listContent(id: string): Promise<ContentItem[]> {
  return withLock(id, async () => scan(await getInstance(id)))
}

export async function installedProjectIds(id: string): Promise<string[]> {
  const items = await listContent(id)
  return [...new Set(items.map((i) => i.project?.id).filter((x): x is string => Boolean(x)))]
}

/* ───────────── Updates ───────────── */

function updateLoaders(type: ContentType): string[] {
  switch (type) {
    case 'mod':
      return MOD_LOADERS
    case 'resourcepack':
      return ['minecraft']
    case 'shader':
      return ['iris', 'canvas', 'vanilla']
    case 'datapack':
      return ['datapack']
  }
}

export async function checkUpdates(id: string): Promise<ContentItem[]> {
  return withLock(id, async () => {
    const inst = await getInstance(id)
    const items = await scan(inst)
    const cache = await readCache(id)
    cache.updates = {}
    for (const type of Object.keys(CONTENT_FOLDERS) as ContentType[]) {
      const ofType = items.filter((i) => i.type === type && i.version)
      if (!ofType.length) continue
      const loaders = updateLoaders(type)
      const latest = await mr.latestFromHashes(
        ofType.map((i) => i.sha1),
        loaders,
        [inst.mcVersion]
      )
      for (const i of ofType) {
        let l: MrVersion | undefined = latest[i.sha1]
        if (!l || l.id === i.version!.id) continue
        // Modrinth returns the newest version of any type. Stay on stable releases unless already on a beta/alpha.
        if (l.version_type !== 'release') {
          const current = (await mr.versionsByIds([i.version!.id]))[0]
          if (current?.version_type === 'release') {
            const all = (await mr.versions(i.project!.id, { loaders, gameVersions: [inst.mcVersion] })).sort(byNewest)
            l = all.find((v) => v.version_type === 'release')
            if (!l || l.id === current.id || l.date_published <= current.date_published) continue
          }
        }
        cache.updates[i.sha1] = { versionId: l.id, number: l.version_number }
      }
    }
    await writeCache(id, cache)
    return items.map((i) => ({ ...i, update: cache.updates[i.sha1] ?? null }))
  })
}

/* ───────────── Install ───────────── */

const byNewest = (a: MrVersion, b: MrVersion) => b.date_published.localeCompare(a.date_published)
const pick = (list: MrVersion[]) => {
  const sorted = [...list].sort(byNewest)
  return sorted.find((v) => v.version_type === 'release') ?? sorted[0]
}

function typeFor(project: MrProject, version: MrVersion, inst: Instance): ContentType {
  if (project.project_type === 'resourcepack') return 'resourcepack'
  if (project.project_type === 'shader') return 'shader'
  if (project.project_type === 'modpack') throw new Error('Modpacks install as their own instance.')
  if (version.loaders.some((l) => MOD_LOADERS.includes(l))) return 'mod'
  if (version.loaders.includes('datapack')) return 'datapack'
  return 'mod'
}

async function bestVersion(project: MrProject, inst: Instance): Promise<MrVersion> {
  const gv = [inst.mcVersion]
  const pt = project.project_type
  let found: MrVersion | undefined
  if (pt === 'resourcepack' || pt === 'shader') {
    found = pick(await mr.versions(project.id, { gameVersions: gv }))
  } else {
    found = pick(await mr.versions(project.id, { loaders: MOD_LOADERS, gameVersions: gv }))
    if (!found && project.loaders.includes('datapack')) found = pick(await mr.versions(project.id, { loaders: ['datapack'], gameVersions: gv }))
  }
  if (!found) {
    throw new Error(`${project.title} has no Fabric version for Minecraft ${inst.mcVersion}`)
  }
  return found
}

interface InstallCtx {
  inst: Instance
  installed: Map<string, ContentItem[]> // projectId → current files
  visited: Set<string>
  task: TaskHandle
  installedTitles: string[]
}

async function installVersion(ctx: InstallCtx, project: MrProject, version: MrVersion): Promise<void> {
  if (ctx.visited.has(project.id)) return
  ctx.visited.add(project.id)

  const type = typeFor(project, version, ctx.inst)
  const file = version.files.find((f) => f.primary) ?? version.files[0]
  if (!file) throw new Error(`${project.title} ${version.version_number} has no files`)
  const name = basename(file.filename.replace(/\\/g, '/'))
  const folder = join(ctx.inst.path, CONTENT_FOLDERS[type])
  const dest = join(folder, name)

  ctx.task.update(`Downloading ${project.title}`, null)
  await download(file.url, dest, {
    sha1: file.hashes.sha1,
    onProgress: (r, t) => t && ctx.task.update(`Downloading ${project.title}`, r / t)
  })

  // Remove older files of the same project (this is how updates replace the old jar).
  for (const old of ctx.installed.get(project.id) ?? []) {
    if (old.file !== name) await rm(join(ctx.inst.path, CONTENT_FOLDERS[old.type], old.file), { force: true })
  }
  ctx.installed.set(project.id, [])
  ctx.installedTitles.push(project.title)

  // Record what we know so the Content tab doesn't need a lookup.
  const cache = await readCache(ctx.inst.id)
  cache.meta[file.hashes.sha1] = toMeta(project, version)
  delete cache.updates[file.hashes.sha1]
  await writeCache(ctx.inst.id, cache)

  // Required dependencies.
  for (const dep of version.dependencies) {
    if (dep.dependency_type !== 'required') continue
    try {
      if (dep.project_id && (ctx.installed.has(dep.project_id) || ctx.visited.has(dep.project_id))) continue
      if (dep.version_id) {
        const v = await mr.version(dep.version_id)
        if (ctx.installed.has(v.project_id) || ctx.visited.has(v.project_id)) continue
        await installVersion(ctx, await mr.project(v.project_id), v)
      } else if (dep.project_id) {
        const p = await mr.project(dep.project_id)
        await installVersion(ctx, p, await bestVersion(p, ctx.inst))
      }
    } catch (e) {
      throw new Error(`${project.title} needs a dependency that couldn't be installed: ${e instanceof Error ? e.message : e}`)
    }
  }
}

async function installedMap(inst: Instance): Promise<Map<string, ContentItem[]>> {
  const map = new Map<string, ContentItem[]>()
  for (const item of await scan(inst)) {
    if (!item.project) continue
    map.set(item.project.id, [...(map.get(item.project.id) ?? []), item])
  }
  return map
}

export async function installProject(id: string, projectIdOrSlug: string, versionId?: string): Promise<void> {
  const inst = await getInstance(id)
  const project = await mr.project(projectIdOrSlug)
  await withTask(
    `Installing ${project.title}`,
    (task) =>
      withLock(id, async () => {
        const version = versionId ? await mr.version(versionId) : await bestVersion(project, inst)
        const ctx: InstallCtx = { inst, installed: await installedMap(inst), visited: new Set(), task, installedTitles: [] }
        await installVersion(ctx, project, version)
        task.update(`Installed ${ctx.installedTitles.join(', ')}`, 1)
      }),
    id
  )
}

/** Install several projects, continuing past ones that aren't available for this version. */
export async function installMany(id: string, slugs: string[], title: string): Promise<string[]> {
  const inst = await getInstance(id)
  const skipped: string[] = []
  await withTask(
    title,
    (task) =>
      withLock(id, async () => {
        const ctx: InstallCtx = { inst, installed: await installedMap(inst), visited: new Set(), task, installedTitles: [] }
        for (const [i, slug] of slugs.entries()) {
          task.update(`Installing ${slug} (${i + 1}/${slugs.length})`, i / slugs.length)
          try {
            const p = await mr.project(slug)
            await installVersion(ctx, p, await bestVersion(p, inst))
          } catch {
            skipped.push(slug)
          }
        }
        task.update(skipped.length ? `Not available for ${inst.mcVersion}: ${skipped.join(', ')}` : 'All mods installed', 1)
      }),
    id
  )
  return skipped
}

export const PERFORMANCE_PACK = ['fabric-api', 'sodium', 'lithium', 'iris']

export async function updateContent(id: string, files: { file: string; type: ContentType }[]): Promise<void> {
  const inst = await getInstance(id)
  await withTask(
    files.length === 1 ? `Updating ${files[0].file}` : `Updating ${files.length} items`,
    (task) =>
      withLock(id, async () => {
        const items = await scan(inst)
        const ctx: InstallCtx = { inst, installed: await installedMap(inst), visited: new Set(), task, installedTitles: [] }
        const targets = items.filter((i) => i.update && i.project && files.some((f) => f.file === i.file && f.type === i.type))
        for (const [n, item] of targets.entries()) {
          task.update(`Updating ${item.project!.title} (${n + 1}/${targets.length})`, n / targets.length)
          const [p, v] = await Promise.all([mr.project(item.project!.id), mr.version(item.update!.versionId)])
          await installVersion(ctx, p, v)
          // Keep a disabled mod disabled after updating.
          if (!item.enabled) {
            const file = v.files.find((f) => f.primary) ?? v.files[0]
            const abs = join(inst.path, CONTENT_FOLDERS[item.type], basename(file.filename))
            await rename(abs, `${abs}.disabled`).catch(() => {})
          }
        }
      }),
    id
  )
}

/* ───────────── Local file operations ───────────── */

function contentFile(inst: Instance, type: ContentType, file: string): string {
  if (!(type in CONTENT_FOLDERS) || file !== basename(file) || !EXT[type].test(file)) throw new Error('Invalid file')
  return join(inst.path, CONTENT_FOLDERS[type], file)
}

export async function toggleContent(id: string, file: string, type: ContentType): Promise<void> {
  const inst = await getInstance(id)
  const abs = contentFile(inst, type, file)
  await rename(abs, file.endsWith('.disabled') ? abs.slice(0, -'.disabled'.length) : `${abs}.disabled`)
}

export async function removeContent(id: string, file: string, type: ContentType): Promise<void> {
  const inst = await getInstance(id)
  await rm(contentFile(inst, type, file), { force: true })
}

export async function addLocalFile(id: string, src: string, type: ContentType): Promise<void> {
  const inst = await getInstance(id)
  const dest = contentFile(inst, type, basename(src))
  await mkdir(join(inst.path, CONTENT_FOLDERS[type]), { recursive: true })
  await copyFile(src, dest)
}

