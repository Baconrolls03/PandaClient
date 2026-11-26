// Installs vanilla Minecraft (client jar, libraries, natives, assets) from Mojang's servers,
// and merges a Fabric profile on top. Nothing from Mojang is ever bundled with PandaClient.
import { existsSync } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { unzipSync } from 'fflate'
import { download, getJson, pool, sha1 } from '../http'
import { getSettings } from '../settings'
import type { TaskHandle } from '../tasks'

export const MOJANG_MANIFEST = process.env['PANDA_MOJANG_MANIFEST'] ?? 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
const ASSETS_BASE = process.env['PANDA_ASSETS_BASE'] ?? 'https://resources.download.minecraft.net'
const FABRIC_META = process.env['PANDA_FABRIC_META'] ?? 'https://meta.fabricmc.net/v2'

/* ───────────── Types (subset of Mojang's version JSON) ───────────── */

export interface Rule {
  action: 'allow' | 'disallow'
  os?: { name?: string; arch?: string; version?: string }
  features?: Record<string, boolean>
}
export type Arg = string | { rules?: Rule[]; value: string | string[] }
interface Artifact {
  path: string
  url: string
  sha1?: string
  size?: number
}
export interface Library {
  name: string
  url?: string // Fabric-style maven base
  sha1?: string
  size?: number
  downloads?: { artifact?: Artifact; classifiers?: Record<string, Artifact> }
  natives?: Record<string, string>
  rules?: Rule[]
  extract?: { exclude?: string[] }
}
export interface VersionJson {
  id: string
  inheritsFrom?: string
  type?: string
  mainClass: string
  minecraftArguments?: string
  arguments?: { game?: Arg[]; jvm?: Arg[] }
  libraries: Library[]
  assetIndex?: { id: string; url: string; sha1: string; totalSize?: number }
  assets?: string
  downloads?: { client?: { url: string; sha1: string; size: number } }
  javaVersion?: { component: string; majorVersion: number }
  logging?: { client?: { argument: string; file: { id: string; url: string; sha1: string } } }
}

/* ───────────── Platform rules ───────────── */

export const osName = (): 'windows' | 'osx' | 'linux' =>
  process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux'

export function rulesAllow(rules: Rule[] | undefined, features: Record<string, boolean> = {}): boolean {
  if (!rules?.length) return true
  let allowed = false
  for (const r of rules) {
    let match = true
    if (r.os?.name && r.os.name !== osName()) match = false
    if (r.os?.arch) {
      const arch = process.arch === 'ia32' ? 'x86' : process.arch === 'arm64' ? 'arm64' : 'x86_64'
      if (r.os.arch !== arch) match = false
    }
    if (r.features) for (const [k, v] of Object.entries(r.features)) if ((features[k] ?? false) !== v) match = false
    if (match) allowed = r.action === 'allow'
  }
  return allowed
}

/** Skip native jars built for a different CPU (e.g. natives-windows-arm64 on an x64 PC). */
function wrongArch(name: string): boolean {
  const classifier = name.split(':')[3] ?? ''
  if (!classifier.startsWith('natives-')) return false
  const isArm = /arm64|aarch64/.test(classifier)
  const isX86 = /-x86$/.test(classifier)
  if (process.arch === 'arm64') return !isArm
  if (process.arch === 'ia32') return !isX86
  return isArm || isX86
}

/* ───────────── Paths ───────────── */

export const root = () => getSettings().gameDir
export const versionsDir = () => join(root(), 'versions')
export const librariesDir = () => join(root(), 'libraries')
export const assetsDir = () => join(root(), 'assets')

/** net.fabricmc:fabric-loader:0.16.5 → net/fabricmc/fabric-loader/0.16.5/fabric-loader-0.16.5.jar */
export function mavenPath(name: string): string {
  const [coords, ext = 'jar'] = name.split('@')
  const [group, artifact, version, classifier] = coords.split(':')
  return `${group.replace(/\./g, '/')}/${artifact}/${version}/${artifact}-${version}${classifier ? `-${classifier}` : ''}.${ext}`
}

/* ───────────── Version JSON ───────────── */

interface Manifest {
  latest: { release: string; snapshot: string }
  versions: { id: string; url: string; sha1: string; type: string }[]
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T
  } catch {
    return null
  }
}

export async function vanillaJson(id: string): Promise<VersionJson> {
  const path = join(versionsDir(), id, `${id}.json`)
  const manifest = await getJson<Manifest>(MOJANG_MANIFEST).catch(() => null)
  const entry = manifest?.versions.find((v) => v.id === id)
  const cached = await readJson<VersionJson>(path)
  if (cached && (!entry || sha1(new Uint8Array(await readFile(path))) === entry.sha1)) return cached
  if (!entry) throw new Error(manifest ? `Minecraft ${id} doesn't exist` : "Couldn't reach Mojang to download Minecraft")
  await download(entry.url, path, { sha1: entry.sha1 })
  return (await readJson<VersionJson>(path))!
}

/** Fabric's launcher profile for this game + loader version, saved next to the vanilla one. */
export async function fabricJson(mc: string, loader: string): Promise<VersionJson> {
  const id = `fabric-loader-${loader}-${mc}`
  const path = join(versionsDir(), id, `${id}.json`)
  const cached = await readJson<VersionJson>(path)
  if (cached) return cached
  const profile = await getJson<VersionJson>(`${FABRIC_META}/versions/loader/${encodeURIComponent(mc)}/${encodeURIComponent(loader)}/profile/json`)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(profile, null, 2))
  return profile
}

const libKey = (name: string) => {
  const [g, a, , c] = name.split('@')[0].split(':')
  return `${g}:${a}${c ? `:${c}` : ''}`
}

/** Fabric profile on top of vanilla: Fabric's libraries win, arguments are concatenated. */
export function merge(child: VersionJson, parent: VersionJson): VersionJson {
  // Only Fabric's libraries replace vanilla ones. Vanilla can list one library twice with different OS rules
  // (e.g. LWJGL 3.2.1 for macOS and 3.2.2 for everything else), so it must not be de-duplicated against itself.
  const childKeys = new Set(child.libraries.map((l) => libKey(l.name)))
  const libraries = [...child.libraries, ...parent.libraries.filter((l) => !childKeys.has(libKey(l.name)))]
  return {
    ...parent,
    id: child.id,
    mainClass: child.mainClass,
    libraries,
    arguments: {
      game: [...(parent.arguments?.game ?? []), ...(child.arguments?.game ?? [])],
      jvm: [...(parent.arguments?.jvm ?? []), ...(child.arguments?.jvm ?? [])]
    },
    minecraftArguments: child.minecraftArguments ?? parent.minecraftArguments
  }
}

/* ───────────── Install ───────────── */

interface Job {
  url: string
  dest: string
  sha1?: string
  size?: number
}

async function needs(job: Job): Promise<boolean> {
  try {
    const s = await stat(job.dest)
    return job.size != null ? s.size !== job.size : false
  } catch {
    return true
  }
}

export interface ResolvedLibraries {
  classpath: string[]
  /** Old-style native jars that must be unpacked into the natives folder. */
  nativeJars: { path: string; exclude: string[] }[]
}

export function libraryJobs(v: VersionJson): { jobs: Job[]; resolved: ResolvedLibraries } {
  const jobs: Job[] = []
  const classpath: string[] = []
  const nativeJars: ResolvedLibraries['nativeJars'] = []
  for (const lib of v.libraries) {
    if (!rulesAllow(lib.rules) || wrongArch(lib.name)) continue
    // Old style: natives listed per OS under "classifiers".
    if (lib.natives) {
      const classifier = lib.natives[osName()]?.replace('${arch}', process.arch === 'ia32' ? '32' : '64')
      const art = classifier ? lib.downloads?.classifiers?.[classifier] : undefined
      if (art) {
        const dest = join(librariesDir(), art.path)
        jobs.push({ url: art.url, dest, sha1: art.sha1, size: art.size })
        nativeJars.push({ path: dest, exclude: lib.extract?.exclude ?? ['META-INF/'] })
      }
      if (!lib.downloads?.artifact) continue
    }
    const art = lib.downloads?.artifact
    if (art) {
      if (!art.url) continue
      const dest = join(librariesDir(), art.path)
      jobs.push({ url: art.url, dest, sha1: art.sha1, size: art.size })
      classpath.push(dest)
    } else {
      // Fabric / maven style.
      const rel = mavenPath(lib.name)
      const base = (lib.url ?? 'https://libraries.minecraft.net/').replace(/\/?$/, '/')
      const dest = join(librariesDir(), rel)
      jobs.push({ url: base + rel, dest, sha1: lib.sha1, size: lib.size })
      classpath.push(dest)
    }
  }
  // Old versions list some jars twice (plain + with natives): keep one of each file.
  const uniq = <T,>(list: T[], key: (t: T) => string) => list.filter((x, i) => list.findIndex((y) => key(y) === key(x)) === i)
  return {
    jobs: uniq(jobs, (j) => j.dest),
    resolved: { classpath: uniq(classpath, (p) => p), nativeJars: uniq(nativeJars, (n) => n.path) }
  }
}

async function runJobs(jobs: Job[], label: string, task: TaskHandle, from: number, to: number): Promise<void> {
  const todo: Job[] = []
  for (const j of jobs) if (await needs(j)) todo.push(j)
  let done = 0
  await pool(todo, getSettings().maxDownloads, async (j) => {
    await download(j.url, j.dest, { sha1: j.sha1 })
    done++
    if (done % 10 === 0 || done === todo.length) task.update(`${label} (${done}/${todo.length})`, from + (to - from) * (done / todo.length))
  })
}

export async function extractNatives(jars: ResolvedLibraries['nativeJars'], dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
  for (const { path, exclude } of jars) {
    const files = unzipSync(new Uint8Array(await readFile(path)))
    for (const [name, data] of Object.entries(files)) {
      if (name.endsWith('/') || exclude.some((e) => name.startsWith(e))) continue
      const out = join(dir, name.split('/').pop()!)
      if (!existsSync(out)) await writeFile(out, data)
    }
  }
}

export interface Installed {
  version: VersionJson
  clientJar: string
  libraries: ResolvedLibraries
  nativesDir: string
  assetsIndex: string
  loggingConfig: string | null
}

/** Download everything needed to run `mc` (+ Fabric). Safe to call every launch: finished files are skipped. */
export async function install(mc: string, fabricLoader: string | null, task: TaskHandle): Promise<Installed> {
  task.update(`Getting Minecraft ${mc}`, 0.02)
  const vanilla = await vanillaJson(mc)
  const version = fabricLoader ? merge(await fabricJson(mc, fabricLoader), vanilla) : vanilla

  // Client jar
  const clientJar = join(versionsDir(), mc, `${mc}.jar`)
  const client = vanilla.downloads?.client
  if (!client) throw new Error(`Minecraft ${mc} has no client download`)
  await runJobs([{ url: client.url, dest: clientJar, sha1: client.sha1, size: client.size }], 'Downloading Minecraft', task, 0.03, 0.1)

  // Libraries
  const { jobs, resolved } = libraryJobs(version)
  await runJobs(jobs, 'Downloading libraries', task, 0.1, 0.35)

  // Assets
  const idx = vanilla.assetIndex
  if (!idx) throw new Error('Version has no asset index')
  const indexPath = join(assetsDir(), 'indexes', `${idx.id}.json`)
  if (!existsSync(indexPath) || sha1(new Uint8Array(await readFile(indexPath))) !== idx.sha1) await download(idx.url, indexPath, { sha1: idx.sha1 })
  const index = JSON.parse(await readFile(indexPath, 'utf8')) as { objects: Record<string, { hash: string; size: number }> }
  const unique = new Map<string, number>()
  for (const o of Object.values(index.objects)) unique.set(o.hash, o.size)
  const assetJobs = [...unique].map(([hash, size]) => ({
    url: `${ASSETS_BASE}/${hash.slice(0, 2)}/${hash}`,
    dest: join(assetsDir(), 'objects', hash.slice(0, 2), hash),
    sha1: hash,
    size
  }))
  await runJobs(assetJobs, 'Downloading assets', task, 0.35, 0.85)

  // Logging config (log4j)
  let loggingConfig: string | null = null
  const log = vanilla.logging?.client
  if (log) {
    loggingConfig = join(assetsDir(), 'log_configs', log.file.id)
    await runJobs([{ url: log.file.url, dest: loggingConfig, sha1: log.file.sha1 }], 'Downloading log config', task, 0.85, 0.87)
  }

  // Natives
  const nativesDir = join(versionsDir(), version.id, 'natives')
  task.update('Preparing natives', 0.88)
  await extractNatives(resolved.nativeJars, nativesDir)

  return { version, clientJar, libraries: resolved, nativesDir, assetsIndex: idx.id, loggingConfig }
}
