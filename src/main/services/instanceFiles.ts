import { shell } from 'electron'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import type { FileEntry, LogFile, Screenshot, ServerEntry, WorldInfo } from '@shared/types'
import { instanceDir } from './instances'
import { readNbt, writeNbt, type Tag } from './nbt'
import { localUrl, safeJoin } from './paths'

const trash = (p: string) => shell.trashItem(p).catch(() => rm(p, { recursive: true, force: true }))

/* ───────────── Worlds & servers ───────────── */

const GAME_MODES = ['Survival', 'Creative', 'Adventure', 'Spectator']

export async function listWorlds(id: string): Promise<WorldInfo[]> {
  const saves = join(instanceDir(id), 'saves')
  if (!existsSync(saves)) return []
  const out: WorldInfo[] = []
  for (const e of await readdir(saves, { withFileTypes: true })) {
    if (!e.isDirectory()) continue
    const dir = join(saves, e.name)
    const info: WorldInfo = { folder: e.name, name: e.name, lastPlayed: null, gameMode: null, iconUrl: null }
    try {
      const { root } = readNbt(gunzipSync(await readFile(join(dir, 'level.dat'))))
      const data = root.value['Data']
      if (data?.type === 10) {
        const d = data.value
        if (d['LevelName']?.type === 8) info.name = d['LevelName'].value
        if (d['LastPlayed']?.type === 4) info.lastPlayed = Number(d['LastPlayed'].value)
        const hardcore = d['hardcore']?.type === 1 && d['hardcore'].value === 1
        if (d['GameType']?.type === 3) info.gameMode = hardcore ? 'Hardcore' : (GAME_MODES[d['GameType'].value] ?? null)
      }
    } catch {
      if (!existsSync(join(dir, 'level.dat'))) continue // not a world
    }
    const icon = join(dir, 'icon.png')
    if (existsSync(icon)) info.iconUrl = localUrl(icon, (await stat(icon)).mtimeMs)
    out.push(info)
  }
  return out.sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
}

export async function removeWorld(id: string, folder: string): Promise<void> {
  await trash(safeJoin(join(instanceDir(id), 'saves'), folder))
}

type Compound = Extract<Tag, { type: 10 }>

async function readServersDat(id: string): Promise<Compound> {
  try {
    return readNbt(new Uint8Array(await readFile(join(instanceDir(id), 'servers.dat')))).root
  } catch {
    return { type: 10, value: { servers: { type: 9, listType: 10, value: [] } } }
  }
}

function serverList(root: Compound): Compound[] {
  const list = root.value['servers']
  return list?.type === 9 ? (list.value.filter((t) => t.type === 10) as Compound[]) : []
}

function toEntry(c: Compound): ServerEntry {
  const s = (k: string) => (c.value[k]?.type === 8 ? (c.value[k].value as string) : '')
  const icon = s('icon')
  return { name: s('name') || 'Minecraft Server', ip: s('ip'), iconUrl: icon ? `data:image/png;base64,${icon}` : null }
}

export async function listServers(id: string): Promise<ServerEntry[]> {
  return serverList(await readServersDat(id)).map(toEntry)
}

async function writeServers(id: string, servers: Compound[]): Promise<ServerEntry[]> {
  const root: Compound = { type: 10, value: { servers: { type: 9, listType: 10, value: servers } } }
  await writeFile(join(instanceDir(id), 'servers.dat'), writeNbt(root))
  return servers.map(toEntry)
}

export async function addServer(id: string, s: { name: string; ip: string }): Promise<ServerEntry[]> {
  const ip = s.ip.trim()
  if (!ip) throw new Error('Server address is required')
  const servers = serverList(await readServersDat(id))
  servers.push({ type: 10, value: { name: { type: 8, value: s.name.trim() || 'Minecraft Server' }, ip: { type: 8, value: ip } } })
  return writeServers(id, servers)
}

export async function removeServer(id: string, index: number): Promise<ServerEntry[]> {
  const servers = serverList(await readServersDat(id))
  servers.splice(index, 1)
  return writeServers(id, servers)
}

/* ───────────── Screenshots ───────────── */

export async function listScreenshots(id: string): Promise<Screenshot[]> {
  const dir = join(instanceDir(id), 'screenshots')
  if (!existsSync(dir)) return []
  const out: Screenshot[] = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (!e.isFile() || !/\.(png|jpe?g)$/i.test(e.name)) continue
    const abs = join(dir, e.name)
    const s = await stat(abs)
    out.push({ file: e.name, url: localUrl(abs, s.mtimeMs), mtime: s.mtimeMs })
  }
  return out.sort((a, b) => b.mtime - a.mtime)
}

export async function removeScreenshot(id: string, file: string): Promise<void> {
  await trash(safeJoin(join(instanceDir(id), 'screenshots'), file))
}

/* ───────────── Files tab ───────────── */

const TEXT_EXT = new Set(['.txt', '.json', '.json5', '.toml', '.properties', '.cfg', '.conf', '.yml', '.yaml', '.ini', '.log', '.md', '.mcmeta', '.snbt', '.csv', ''])
const MAX_TEXT = 2 * 1024 * 1024

export async function listFiles(id: string, dir: string): Promise<FileEntry[]> {
  const base = instanceDir(id)
  const abs = dir ? safeJoin(base, dir) : base
  const out: FileEntry[] = []
  for (const e of await readdir(abs, { withFileTypes: true })) {
    if (e.name === '.panda') continue
    const p = join(abs, e.name)
    const s = await stat(p).catch(() => null)
    if (!s) continue
    out.push({ name: e.name, path: dir ? `${dir}/${e.name}` : e.name, dir: s.isDirectory(), size: s.size, mtime: s.mtimeMs })
  }
  return out.sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name))
}

export function isTextFile(path: string): boolean {
  return TEXT_EXT.has(extname(path).toLowerCase())
}

export async function readTextFile(id: string, rel: string): Promise<string> {
  const abs = safeJoin(instanceDir(id), rel)
  if (!isTextFile(abs)) throw new Error('Only text files can be opened here')
  const s = await stat(abs)
  if (s.size > MAX_TEXT) throw new Error('File is too large to open here')
  return readFile(abs, 'utf8')
}

export async function writeTextFile(id: string, rel: string, text: string): Promise<void> {
  const abs = safeJoin(instanceDir(id), rel)
  if (!isTextFile(abs)) throw new Error('Only text files can be edited here')
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, text)
}

export async function removeFile(id: string, rel: string): Promise<void> {
  if (!rel) throw new Error('Refusing to delete the instance folder')
  await trash(safeJoin(instanceDir(id), rel))
}

export function revealFile(id: string, rel: string): void {
  shell.showItemInFolder(rel ? safeJoin(instanceDir(id), rel) : instanceDir(id))
}

/* ───────────── Logs ───────────── */

export async function listLogs(id: string): Promise<LogFile[]> {
  const base = instanceDir(id)
  const out: LogFile[] = []
  for (const [sub, kind, re] of [
    ['logs', 'log', /\.log(\.gz)?$/i],
    ['crash-reports', 'crash', /\.txt$/i]
  ] as const) {
    const dir = join(base, sub)
    if (!existsSync(dir)) continue
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (!e.isFile() || !re.test(e.name)) continue
      const s = await stat(join(dir, e.name))
      out.push({ name: e.name, path: `${sub}/${e.name}`, kind, mtime: s.mtimeMs, size: s.size })
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime)
}

export async function readLog(id: string, rel: string): Promise<string> {
  if (!/^(logs|crash-reports)\//.test(rel)) throw new Error('Not a log file')
  const abs = safeJoin(instanceDir(id), rel)
  let buf = await readFile(abs)
  if (abs.endsWith('.gz')) buf = gunzipSync(buf)
  // Show the tail of huge logs.
  const text = buf.toString('utf8')
  return text.length > MAX_TEXT ? `… (showing the last 2 MB)\n${text.slice(-MAX_TEXT)}` : text
}
