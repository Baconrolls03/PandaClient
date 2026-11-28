// Moves the mods, packs and settings of one profile into another, getting each mod for the
// new profile's Minecraft version from Modrinth. Mods with no version for it are left out and listed.
import { existsSync } from 'node:fs'
import { copyFile, cp, mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { CONTENT_FOLDERS, type TransferReport } from '@shared/types'
import { getInstance } from './instances'
import { installMany, listContent } from './content'

/** Files PandaClient manages itself: never copied. */
const SKIP = /^pandaclient.*\.jar/i

export async function transferProfile(fromId: string, toId: string): Promise<TransferReport> {
  const from = await getInstance(fromId)
  const to = await getInstance(toId)
  const sameVersion = from.mcVersion === to.mcVersion
  const items = (await listContent(fromId)).filter((i) => !SKIP.test(i.file))
  const report: TransferReport = { profileId: to.id, profileName: to.name, from: from.name, moved: [], removed: [] }

  // Packs, shaders and data packs: copied as they are.
  for (const i of items.filter((x) => x.type !== 'mod')) {
    const dir = CONTENT_FOLDERS[i.type]
    await mkdir(join(to.path, dir), { recursive: true })
    await copyFile(join(from.path, dir, i.file), join(to.path, dir, i.file)).catch(() => {})
    report.moved.push(i.project?.title ?? i.file)
  }

  const mods = items.filter((x) => x.type === 'mod' && x.enabled)
  if (sameVersion) {
    await mkdir(join(to.path, 'mods'), { recursive: true })
    for (const m of mods) {
      await copyFile(join(from.path, 'mods', m.file), join(to.path, 'mods', m.file))
      report.moved.push(m.project?.title ?? m.file)
    }
  } else {
    const tracked = mods.filter((m) => m.project)
    for (const m of mods.filter((x) => !x.project))
      report.removed.push({ name: m.file, reason: `Not on Modrinth, so there's no way to get it for ${to.mcVersion}` })
    const ids = [...new Set(tracked.map((m) => m.project!.id))]
    const skipped = new Set(ids.length ? await installMany(to.id, ids, `Moving mods from ${from.name} to ${to.name}`) : [])
    for (const id of ids) {
      const title = tracked.find((m) => m.project!.id === id)!.project!.title
      if (skipped.has(id)) report.removed.push({ name: title, reason: `No version for Minecraft ${to.mcVersion} yet` })
      else report.moved.push(title)
    }
  }

  // Worlds (Minecraft upgrades them to the new version when they're opened).
  const worlds = existsSync(join(from.path, 'saves')) ? (await readdir(join(from.path, 'saves'))).filter((f) => !f.startsWith('.')) : []
  if (worlds.length) {
    await cp(join(from.path, 'saves'), join(to.path, 'saves'), { recursive: true, force: false, errorOnExist: false }).catch(() => {})
    report.moved.push(worlds.length === 1 ? '1 world' : `${worlds.length} worlds`)
  }
  // Mod settings, keybinds and video settings.
  if (existsSync(join(from.path, 'config'))) await cp(join(from.path, 'config'), join(to.path, 'config'), { recursive: true, force: true }).catch(() => {})
  for (const f of ['options.txt', 'servers.dat'])
    if (existsSync(join(from.path, f))) await copyFile(join(from.path, f), join(to.path, f)).catch(() => {})
  return report
}
