// Works out why Minecraft crashed and which mod is the likely cause, from the crash report or the log.
import { existsSync } from 'node:fs'
import { readdir, readFile, rename, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { unzipSync } from 'fflate'
import type { CrashReport, Instance } from '@shared/types'

export interface ModInfo { id: string; name: string; file: string; version: string; enabled: boolean; depends: string[]; provides: string[] }

/** Every mod jar in the instance (on or off), read from fabric.mod.json. */
export async function modIndex(inst: Instance): Promise<ModInfo[]> {
  const dir = join(inst.path, 'mods')
  if (!existsSync(dir)) return []
  const out: ModInfo[] = []
  for (const file of await readdir(dir)) {
    if (!/\.jar(\.disabled)?$/i.test(file)) continue
    try {
      const files = unzipSync(new Uint8Array(await readFile(join(dir, file))), { filter: (f) => f.name === 'fabric.mod.json' })
      const raw = files['fabric.mod.json']
      if (!raw) continue
      const json = JSON.parse(new TextDecoder().decode(raw).replace(/[\u0000-\u001f]+/g, ' ')) as {
        id?: string; name?: string; version?: string; depends?: Record<string, unknown>; provides?: string[]
      }
      if (json.id)
        out.push({
          id: json.id,
          name: json.name ?? json.id,
          file,
          version: String(json.version ?? ''),
          enabled: !/\.disabled$/i.test(file),
          depends: Object.keys(json.depends ?? {}),
          provides: Array.isArray(json.provides) ? json.provides : []
        })
    } catch {
      /* not a readable jar */
    }
  }
  return out
}

/** Compare two mod versions ("0.5.11+mc1.21.11" > "0.5.9"). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[^0-9]+/).filter(Boolean).map(Number)
  const pb = b.split(/[^0-9]+/).filter(Boolean).map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d) return d
  }
  return 0
}

export interface Duplicate { id: string; name: string; keep: string; extra: string[] }

/** Mods that are switched on more than once (two copies of Sodium etc.). Keeps the newest copy. */
export function findDuplicates(mods: ModInfo[]): Duplicate[] {
  const groups = new Map<string, ModInfo[]>()
  for (const m of mods) if (m.enabled) groups.set(m.id, [...(groups.get(m.id) ?? []), m])
  const out: Duplicate[] = []
  for (const [id, list] of groups) {
    if (list.length < 2) continue
    list.sort((a, b) => compareVersions(b.version, a.version) || b.file.localeCompare(a.file))
    out.push({ id, name: list[0].name, keep: list[0].file, extra: list.slice(1).map((m) => m.file) })
  }
  return out
}

/** Turn off the older copies of duplicated mods. Returns what was fixed. */
export async function fixDuplicates(inst: Instance): Promise<Duplicate[]> {
  const dups = findDuplicates(await modIndex(inst))
  for (const d of dups) for (const f of d.extra) await rename(join(inst.path, 'mods', f), join(inst.path, 'mods', `${f}.disabled`)).catch(() => {})
  return dups
}

const IGNORE = new Set(['minecraft', 'java', 'fabricloader', 'fabric-api', 'mixinextras', 'pandaclient'])

/** Diagnose the crash that just happened (only looks at files written since `since`). */
export async function diagnose(inst: Instance, since: number): Promise<CrashReport> {
  let text = ''
  let file: string | undefined
  const reports = join(inst.path, 'crash-reports')
  if (existsSync(reports)) {
    const recent = []
    for (const f of await readdir(reports)) {
      const s = await stat(join(reports, f)).catch(() => null)
      if (s && s.mtimeMs >= since - 2000) recent.push({ f, t: s.mtimeMs })
    }
    recent.sort((a, b) => b.t - a.t)
    if (recent[0]) {
      file = join(reports, recent[0].f)
      text = await readFile(file, 'utf8')
    }
  }
  if (!text) {
    const log = join(inst.path, 'logs', 'latest.log')
    if (existsSync(log)) text = (await readFile(log, 'utf8')).slice(-200_000)
  }

  const mods = await modIndex(inst)
  const byId = new Map(mods.filter((m) => m.enabled).map((m) => [m.id.toLowerCase(), m]))
  const found = new Map<string, { id: string; name: string; file: string }>()
  const add = (id: string) => {
    const m = byId.get(id.toLowerCase())
    if (m && m.enabled && !IGNORE.has(m.id)) found.set(m.id, { id: m.id, name: m.name, file: m.file })
  }

  // Fabric's own verdicts.
  const suspected = text.match(/Suspected Mods?:([^\n]*(?:\n\t[^\n]+)*)/)
  if (suspected) for (const m of suspected[1].matchAll(/\(([a-z0-9_.-]+)\)/gi)) add(m[1])
  for (const m of text.matchAll(/Mixin [^\n]*?from mod ([a-z0-9_.-]+)/gi)) add(m[1])
  for (const m of text.matchAll(/(?:Mod|mod) '[^']*' \(([a-z0-9_.-]+)\)/g)) add(m[1])
  for (const m of text.matchAll(/\[([a-z0-9_.-]+)\.mixins?\.json/gi)) add(m[1])
  // Otherwise: mod ids that appear in the stack trace's package names.
  if (!found.size) {
    const trace = text.match(/(?:Caused by|Exception)[\s\S]{0,6000}/)?.[0] ?? ''
    for (const m of mods) if (m.enabled && !IGNORE.has(m.id) && m.id.length > 3 && new RegExp(`[./]${m.id.replace(/[-_]/g, '[-_]?')}[./]`, 'i').test(trace)) found.set(m.id, { id: m.id, name: m.name, file: m.file })
  }

  let summary = 'Minecraft crashed.'
  if (/Incompatible mods found|Mod resolution failed|requires .* which is missing/i.test(text)) summary = 'Some mods need other mods or a different version.'
  else if (/Mixin apply|MixinApplyError|InvalidMixinException|Mixin transformation/i.test(text)) summary = 'Two mods clash with each other.'
  else if (/OutOfMemoryError/i.test(text)) summary = 'Minecraft ran out of memory. Give it more RAM in the instance settings.'
  else if (/GLFW error|OpenGL|Pixel format not accelerated/i.test(text)) summary = 'Your graphics driver had a problem. Try updating it.'
  if (found.size) summary += ` Likely cause: ${[...found.values()].map((m) => m.name).join(', ')}.`

  const lines = text.split('\n')
  const at = lines.findIndex((l) => /Incompatible mods|Caused by|Exception|Description:/i.test(l))
  const excerpt = (at >= 0 ? lines.slice(at, at + 14) : lines.slice(-14)).join('\n').slice(0, 2000)
  return { summary, mods: [...found.values()].slice(0, 6), file, excerpt }
}
