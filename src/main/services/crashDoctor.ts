// Works out why Minecraft crashed and which mod is the likely cause, from the crash report or the log.
import { existsSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { unzipSync } from 'fflate'
import type { CrashReport, Instance } from '@shared/types'

interface ModInfo { id: string; name: string; file: string }

/** id/name of every mod jar in the instance (read from fabric.mod.json). */
export async function modIndex(inst: Instance): Promise<ModInfo[]> {
  const dir = join(inst.path, 'mods')
  if (!existsSync(dir)) return []
  const out: ModInfo[] = []
  for (const file of await readdir(dir)) {
    if (!/\.jar$/i.test(file)) continue
    try {
      const files = unzipSync(new Uint8Array(await readFile(join(dir, file))), { filter: (f) => f.name === 'fabric.mod.json' })
      const raw = files['fabric.mod.json']
      if (!raw) continue
      const json = JSON.parse(new TextDecoder().decode(raw).replace(/[\u0000-\u001f]+/g, ' ')) as { id?: string; name?: string }
      if (json.id) out.push({ id: json.id, name: json.name ?? json.id, file })
    } catch {
      /* not a readable jar */
    }
  }
  return out
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
  const byId = new Map(mods.map((m) => [m.id.toLowerCase(), m]))
  const found = new Map<string, ModInfo>()
  const add = (id: string) => {
    const m = byId.get(id.toLowerCase())
    if (m && !IGNORE.has(m.id)) found.set(m.id, m)
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
    for (const m of mods) if (!IGNORE.has(m.id) && m.id.length > 3 && new RegExp(`[./]${m.id.replace(/[-_]/g, '[-_]?')}[./]`, 'i').test(trace)) found.set(m.id, m)
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
