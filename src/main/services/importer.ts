// Import mods, packs, worlds and settings from other launchers (Modrinth App, CurseForge, Prism,
// Lunar, Feather, Dawn, the official launcher) or any folder. PandaClient runs Fabric only, so
// Forge / NeoForge / Quilt mods are skipped and reported; everything else is copied.
import { app } from 'electron'
import { existsSync } from 'node:fs'
import { copyFile, cp, mkdir, readdir, readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join, relative, resolve } from 'node:path'
import { unzipSync } from 'fflate'
import type { ImportInput, ImportResult, ImportSource, LauncherId } from '@shared/types'
import { sha1File } from './http'
import { createInstance, emitInstancesChanged, getInstance } from './instances'
import * as mr from './modrinth'
import { isInside } from './paths'
import { getSettings } from './settings'
import { withTask } from './tasks'

/* ───────────── Where launchers keep things ───────────── */

function roots(): Record<Exclude<LauncherId, 'folder'>, string[]> {
  const home = homedir()
  const appData = app.getPath('appData') // Windows: %APPDATA%, macOS: ~/Library/Application Support, Linux: ~/.config
  const local = process.env['LOCALAPPDATA'] ?? join(home, '.local', 'share')
  const share = join(home, '.local', 'share')
  const win = process.platform === 'win32'
  const mac = process.platform === 'darwin'
  return {
    minecraft: [win ? join(appData, '.minecraft') : mac ? join(appData, 'minecraft') : join(home, '.minecraft')],
    modrinth: [join(appData, 'ModrinthApp', 'profiles'), join(appData, 'com.modrinth.theseus', 'profiles'), join(share, 'ModrinthApp', 'profiles')],
    curseforge: [join(home, 'curseforge', 'minecraft', 'Instances'), join(home, 'Documents', 'Curse', 'Minecraft', 'Instances')],
    prism: [join(appData, 'PrismLauncher', 'instances'), join(share, 'PrismLauncher', 'instances'), join(local, 'PrismLauncher', 'instances')],
    lunar: [join(home, '.lunarclient', 'profiles'), join(appData, 'fabric-mc')],
    feather: [join(appData, '.feather'), join(appData, '.minecraft', 'feather'), join(home, '.feather')],
    dawn: [join(appData, '.dawn'), join(appData, 'Dawn'), join(appData, 'dawnclient'), join(local, 'Dawn'), join(home, '.dawn'), join(home, '.dawnclient')]
  }
}

const CONTENT_DIRS = ['mods', 'resourcepacks', 'shaderpacks', 'saves'] as const
const VERSION_RE = /\b(1\.\d{1,2}(?:\.\d{1,2})?|2\d\.\d{1,2}(?:\.\d{1,2})?)\b/

async function list(dir: string): Promise<string[]> {
  try {
    return await readdir(dir)
  } catch {
    return []
  }
}

async function counts(dir: string): Promise<ImportSource['counts']> {
  const out = { mods: 0, resourcepacks: 0, shaderpacks: 0, saves: 0 }
  out.mods = (await list(join(dir, 'mods'))).filter((f) => /\.jar(\.disabled)?$/i.test(f)).length
  out.resourcepacks = (await list(join(dir, 'resourcepacks'))).filter((f) => !f.startsWith('.')).length
  out.shaderpacks = (await list(join(dir, 'shaderpacks'))).filter((f) => !f.startsWith('.') && !/\.txt$/i.test(f)).length
  for (const w of await list(join(dir, 'saves'))) if (existsSync(join(dir, 'saves', w, 'level.dat'))) out.saves++
  return out
}

const hasContent = (c: ImportSource['counts']) => c.mods + c.resourcepacks + c.shaderpacks + c.saves > 0

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T
  } catch {
    return null
  }
}

/** Never offer PandaClient's own folders back to itself. */
const isOurs = (p: string) => isInside(getSettings().gameDir, p)

async function source(launcher: LauncherId, dir: string, name: string, meta: Partial<ImportSource> = {}): Promise<ImportSource | null> {
  if (isOurs(dir)) return null
  const c = await counts(dir)
  if (!hasContent(c)) return null
  return { id: resolve(dir), launcher, name, path: resolve(dir), mcVersion: meta.mcVersion ?? null, loader: meta.loader ?? null, counts: c }
}

/** Folders under `root` (to `depth`) that look like a game directory (contain mods/, saves/, …). */
async function findGameDirs(root: string, depth = 4): Promise<string[]> {
  const out: string[] = []
  const walk = async (dir: string, d: number) => {
    const entries = await list(dir)
    if (entries.some((e) => (CONTENT_DIRS as readonly string[]).includes(e))) out.push(dir)
    if (d === 0) return
    for (const e of entries) {
      if (e.startsWith('.') && e !== '.minecraft') continue
      if (['mods', 'saves', 'resourcepacks', 'shaderpacks', 'assets', 'libraries', 'versions', 'logs', 'cache', 'jre', 'runtime', 'natives'].includes(e)) continue
      const p = join(dir, e)
      if ((await stat(p).catch(() => null))?.isDirectory()) await walk(p, d - 1)
    }
  }
  if (existsSync(root)) await walk(root, depth)
  return out
}

export async function scanSources(): Promise<ImportSource[]> {
  const r = roots()
  const found: ImportSource[] = []
  const push = (s: ImportSource | null) => s && !found.some((f) => f.id === s.id) && found.push(s)

  for (const dir of r.minecraft) push(await source('minecraft', dir, 'Minecraft Launcher'))

  // Modrinth App: one folder per profile; older versions keep profile.json with the version.
  for (const root of r.modrinth)
    for (const name of await list(root)) {
      const dir = join(root, name)
      const meta = await readJson<{ metadata?: { name?: string; game_version?: string; loader?: string } }>(join(dir, 'profile.json'))
      push(await source('modrinth', dir, meta?.metadata?.name ?? name, { mcVersion: meta?.metadata?.game_version ?? null, loader: meta?.metadata?.loader ?? null }))
    }

  // CurseForge: minecraftinstance.json has gameVersion and the loader ("fabric-0.16.5-1.21.1").
  for (const root of r.curseforge)
    for (const name of await list(root)) {
      const dir = join(root, name)
      const meta = await readJson<{ name?: string; gameVersion?: string; baseModLoader?: { name?: string } }>(join(dir, 'minecraftinstance.json'))
      push(await source('curseforge', dir, meta?.name ?? name, { mcVersion: meta?.gameVersion ?? null, loader: meta?.baseModLoader?.name?.split('-')[0] ?? null }))
    }

  // Prism / MultiMC: mmc-pack.json lists components; the game lives in .minecraft/ or minecraft/.
  for (const root of r.prism)
    for (const name of await list(root)) {
      const dir = join(root, name)
      const pack = await readJson<{ components?: { uid: string; version?: string }[] }>(join(dir, 'mmc-pack.json'))
      if (!pack) continue
      const cfg = await readFile(join(dir, 'instance.cfg'), 'utf8').catch(() => '')
      const title = /^name=(.*)$/m.exec(cfg)?.[1]?.trim() || name
      const mc = pack.components?.find((c) => c.uid === 'net.minecraft')?.version ?? null
      const loader = pack.components?.some((c) => c.uid === 'net.fabricmc.fabric-loader')
        ? 'fabric'
        : pack.components?.some((c) => c.uid === 'net.minecraftforge')
          ? 'forge'
          : pack.components?.some((c) => c.uid === 'net.neoforged')
            ? 'neoforge'
            : pack.components?.some((c) => c.uid === 'org.quiltmc.quilt-loader')
              ? 'quilt'
              : null
      const game = existsSync(join(dir, '.minecraft')) ? join(dir, '.minecraft') : join(dir, 'minecraft')
      push(await source('prism', game, title, { mcVersion: mc, loader }))
    }

  // Lunar, Feather, Dawn don't document their layouts: look for any folder holding mods/worlds/packs.
  for (const launcher of ['lunar', 'feather', 'dawn'] as const)
    for (const root of r[launcher])
      for (const dir of await findGameDirs(root)) {
        const rel = relative(root, dir)
        const label = { lunar: 'Lunar Client', feather: 'Feather', dawn: 'Dawn' }[launcher]
        push(await source(launcher, dir, rel ? `${label} · ${rel.split(/[\\/]/).join(' / ')}` : label, { mcVersion: VERSION_RE.exec(rel)?.[1] ?? null, loader: 'fabric' }))
      }

  return found
}

/** A folder the user picked by hand: the folder itself, or a game folder inside it. */
export async function describeFolder(path: string): Promise<ImportSource> {
  const direct = await source('folder', path, basename(path), { mcVersion: VERSION_RE.exec(basename(path))?.[1] ?? null })
  if (direct) return direct
  for (const dir of await findGameDirs(path, 3)) {
    const s = await source('folder', dir, `${basename(path)} / ${relative(path, dir)}`, { mcVersion: VERSION_RE.exec(relative(path, dir))?.[1] ?? null })
    if (s) return s
  }
  throw new Error("That folder doesn't contain mods, worlds, resource packs or shaders.")
}

/* ───────────── Mod loader detection ───────────── */

export type JarKind = 'fabric' | 'quilt' | 'forge' | 'neoforge' | 'unknown'

export function jarKind(bytes: Uint8Array): JarKind {
  let names: string[] = []
  try {
    // Only look at the file list (filter returns false, so nothing is decompressed).
    unzipSync(bytes, {
      filter: (f) => {
        names.push(f.name)
        return false
      }
    })
  } catch {
    names = []
  }
  if (names.includes('fabric.mod.json')) return 'fabric'
  if (names.includes('quilt.mod.json')) return 'quilt'
  if (names.includes('META-INF/neoforge.mods.toml')) return 'neoforge'
  if (names.includes('META-INF/mods.toml') || names.includes('mcmod.info')) return 'forge'
  return 'unknown'
}

/**
 * Guess the Minecraft version from the mods themselves: look their files up on Modrinth and pick the
 * game version supported by the most of them (newest wins ties).
 */
export async function detectVersion(path: string): Promise<string | null> {
  const modsDir = join(path, 'mods')
  const jars = (await list(modsDir)).filter((f) => /\.jar$/i.test(f)).slice(0, 80)
  if (!jars.length) return null
  const hashes = await Promise.all(jars.map((f) => sha1File(join(modsDir, f))))
  const byHash = await mr.versionsFromHashes(hashes).catch(() => ({}))
  const votes = new Map<string, number>()
  for (const v of Object.values(byHash)) for (const gv of new Set(v.game_versions)) if (/^\d+(\.\d+)+$/.test(gv)) votes.set(gv, (votes.get(gv) ?? 0) + 1)
  if (!votes.size) return null
  const newer = (a: string, b: string) => b.localeCompare(a, undefined, { numeric: true })
  return [...votes].sort((a, b) => b[1] - a[1] || newer(a[0], b[0]))[0][0]
}

/* ───────────── Import ───────────── */

async function copyDir(src: string, dest: string): Promise<number> {
  if (!existsSync(src)) return 0
  await mkdir(dest, { recursive: true })
  let n = 0
  for (const e of await readdir(src, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue
    await cp(join(src, e.name), join(dest, e.name), { recursive: true, force: false, errorOnExist: false })
    n++
  }
  return n
}

export async function importSource(input: ImportInput): Promise<ImportResult> {
  const src = resolve(input.path)
  if (isOurs(src)) throw new Error("That's already a PandaClient folder.")
  if (!existsSync(src)) throw new Error('That folder no longer exists.')

  return withTask(`Importing ${input.name}`, async (task) => {
    const inst = await createInstance({ name: input.name, mcVersion: input.mcVersion, loaderVersion: null, iconPreset: input.iconPreset ?? null })
    const result: ImportResult = { instanceId: inst.id, mods: 0, resourcepacks: 0, shaderpacks: 0, saves: 0, other: [], skipped: [] }

    if (input.include.mods) {
      const dir = join(src, 'mods')
      const jars = (await list(dir)).filter((f) => /\.jar(\.disabled)?$/i.test(f))
      for (const [i, f] of jars.entries()) {
        task.update(`Checking mods (${i + 1}/${jars.length})`, (i / Math.max(1, jars.length)) * 0.4)
        const kind = jarKind(new Uint8Array(await readFile(join(dir, f))))
        if (kind === 'fabric') {
          await copyFile(join(dir, f), join(inst.path, 'mods', f))
          result.mods++
        } else {
          result.skipped.push({ file: f, reason: kind === 'unknown' ? 'Not a Fabric mod' : `${kind === 'neoforge' ? 'NeoForge' : kind[0].toUpperCase() + kind.slice(1)} mod` })
        }
      }
    }
    task.update('Copying packs and shaders', 0.45)
    if (input.include.resourcepacks) result.resourcepacks = await copyDir(join(src, 'resourcepacks'), join(inst.path, 'resourcepacks'))
    if (input.include.shaderpacks) result.shaderpacks = await copyDir(join(src, 'shaderpacks'), join(inst.path, 'shaderpacks'))
    if (input.include.saves) {
      task.update('Copying worlds', 0.6)
      result.saves = await copyDir(join(src, 'saves'), join(inst.path, 'saves'))
    }
    task.update('Copying settings', 0.9)
    if (input.include.config && existsSync(join(src, 'config'))) {
      await copyDir(join(src, 'config'), join(inst.path, 'config'))
      result.other.push('mod configs')
    }
    if (input.include.options) {
      for (const f of ['options.txt', 'optionsof.txt', 'optionsshaders.txt']) {
        if (existsSync(join(src, f))) {
          await copyFile(join(src, f), join(inst.path, f))
          if (f === 'options.txt') result.other.push('game options & keybinds')
        }
      }
    }
    if (input.include.servers && existsSync(join(src, 'servers.dat'))) {
      await copyFile(join(src, 'servers.dat'), join(inst.path, 'servers.dat'))
      result.other.push('server list')
    }
    if (input.include.screenshots && existsSync(join(src, 'screenshots'))) {
      const n = await copyDir(join(src, 'screenshots'), join(inst.path, 'screenshots'))
      if (n) result.other.push(`${n} screenshots`)
    }
    emitInstancesChanged()
    await getInstance(inst.id)
    task.update(`Imported ${result.mods} mods${result.skipped.length ? `, skipped ${result.skipped.length}` : ''}`, 1)
    return result
  })
}
