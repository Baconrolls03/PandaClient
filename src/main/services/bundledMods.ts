// PandaClient's bundled mods: popular client-side mods installed in every supported instance and
// switched on or off from the in-game PandaClient menu (Mods tab).
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { nativeImage } from 'electron'
import type { Instance } from '@shared/types'
import { installMany, listContent, toggleContent } from './content'
import { modIndex } from './crashDoctor'
import { getSettings } from './settings'
import { supportsPandaMod } from './pandaMod'

export const BUNDLED: { slug: string; category: 'Performance' | 'Visuals' | 'Utility' }[] = [
  { slug: 'sodium', category: 'Performance' },
  { slug: 'lithium', category: 'Performance' },
  { slug: 'ferrite-core', category: 'Performance' },
  { slug: 'immediatelyfast', category: 'Performance' },
  { slug: 'entityculling', category: 'Performance' },
  { slug: 'moreculling', category: 'Performance' },
  { slug: 'sound', category: 'Visuals' },
  { slug: 'particle-interactions', category: 'Visuals' },
  { slug: 'fallingleaves', category: 'Visuals' },
  { slug: 'visuality', category: 'Visuals' },
  { slug: '3dskinlayers', category: 'Visuals' },
  { slug: 'lambdynamiclights', category: 'Visuals' },
  { slug: 'not-enough-animations', category: 'Visuals' },
  { slug: 'continuity', category: 'Visuals' },
  { slug: 'language-reload', category: 'Utility' },
  { slug: 'cubes-without-borders', category: 'Utility' },
  { slug: 'bobby', category: 'Utility' },
  // Essential: host your singleplayer world for friends, plus screenshots and friends in game.
  { slug: 'essential', category: 'Utility' }
]

/** Which bundled mods the player switched off (written by the in-game menu, shared by all instances). */
async function disabledSlugs(): Promise<Set<string>> {
  try {
    const raw = JSON.parse(await readFile(join(getSettings().gameDir, 'pandaclient-bundled-prefs.json'), 'utf8')) as { disabled?: string[] }
    return new Set((raw.disabled ?? []).filter((s) => typeof s === 'string'))
  } catch {
    return new Set()
  }
}

/** Install missing bundled mods, apply the on/off choices, and write the list the in-game menu shows. */
export async function ensureBundledMods(inst: Instance, log: (msg: string) => void): Promise<void> {
  if (!supportsPandaMod(inst)) return
  const off = await disabledSlugs()
  let items = (await listContent(inst.id)).filter((i) => i.type === 'mod')
  const bySlug = (slug: string) => items.find((i) => i.project?.slug === slug)
  const missing = BUNDLED.filter((b) => !off.has(b.slug) && !bySlug(b.slug)).map((b) => b.slug)
  if (missing.length) {
    log(`Adding PandaClient mods (${missing.length})`)
    await installMany(inst.id, missing, 'Adding PandaClient mods').catch(() => [])
    items = (await listContent(inst.id)).filter((i) => i.type === 'mod')
  }
  for (const b of BUNDLED) {
    const it = bySlug(b.slug)
    if (it && it.enabled === off.has(b.slug)) await toggleContent(inst.id, it.file, 'mod').catch(() => {})
  }
  items = (await listContent(inst.id)).filter((i) => i.type === 'mod')

  // The list for the in-game Mods tab (with icons converted to PNG, which Minecraft can load).
  const dir = join(inst.path, 'pandaclient')
  await mkdir(join(dir, 'icons'), { recursive: true })
  const ids = new Map((await modIndex(inst)).map((m) => [m.file, m.id]))
  const list = []
  for (const b of BUNDLED) {
    const it = bySlug(b.slug)
    if (!it) continue
    let icon: string | null = null
    const iconFile = join(dir, 'icons', `${b.slug}.png`)
    if (existsSync(iconFile)) icon = iconFile
    else if (it.project?.iconUrl) {
      try {
        const res = await fetch(it.project.iconUrl, { signal: AbortSignal.timeout(8000) })
        const png = nativeImage.createFromBuffer(Buffer.from(await res.arrayBuffer())).resize({ width: 64, height: 64 }).toPNG()
        if (png.length) (await writeFile(iconFile, png), (icon = iconFile))
      } catch {
        /* no icon */
      }
    }
    list.push({ slug: b.slug, name: it.project?.title ?? b.slug, category: b.category, modId: ids.get(it.file.replace(/\.disabled$/, '')) ?? null, enabled: !off.has(b.slug), icon })
  }
  await writeFile(join(dir, 'bundled.json'), JSON.stringify({ mods: list }, null, 2))
}
