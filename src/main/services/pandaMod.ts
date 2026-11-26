import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import type { Instance } from '@shared/types'
import { installProject, listContent } from './content'
import { sha1File } from './http'

/** Minecraft versions the bundled PandaClient mod is built for. */
export const PANDA_MOD_VERSIONS = ['1.21.11']
const JAR = 'pandaclient.jar'
const FABRIC_API_ID = 'P7dR8mSH'

/** The mod jar shipped inside the installer (resources/mods), or the local Gradle build in development. */
export function bundledJar(): string | null {
  const candidates = app.isPackaged
    ? [join(process.resourcesPath, 'mods', JAR)]
    : [join(app.getAppPath(), 'build', 'mods', JAR), join(app.getAppPath(), 'mod', 'build', 'libs', 'pandaclient-0.1.0.jar')]
  return candidates.find((p) => existsSync(p)) ?? null
}

export function supportsPandaMod(inst: Instance): boolean {
  return inst.loader === 'fabric' && PANDA_MOD_VERSIONS.includes(inst.mcVersion)
}

/**
 * Before launch: put the current PandaClient mod in the instance's mods folder (replacing an
 * older copy) and make sure Fabric API, which it needs, is installed.
 */
export async function ensurePandaMod(inst: Instance, enabled: boolean, log: (msg: string) => void): Promise<void> {
  if (!supportsPandaMod(inst)) return
  const mods = join(inst.path, 'mods')
  const target = join(mods, JAR)
  if (!enabled) {
    if (existsSync(target)) await rm(target, { force: true })
    return
  }
  const src = bundledJar()
  if (!src) return
  await mkdir(mods, { recursive: true })
  // Remove copies the user may have added under another name, and a disabled copy.
  for (const f of await readdir(mods)) {
    if (f !== JAR && /^pandaclient.*\.jar(\.disabled)?$/i.test(f)) await rm(join(mods, f), { force: true })
  }
  if (!existsSync(target) || (await sha1File(target)) !== (await sha1File(src))) {
    log('Adding the PandaClient mod')
    await copyFile(src, target)
  }
  const items = await listContent(inst.id)
  const hasFabricApi = items.some(
    (i) => i.type === 'mod' && i.enabled && (i.project?.id === FABRIC_API_ID || i.project?.slug === 'fabric-api' || /^fabric-api/i.test(i.file))
  )
  if (!hasFabricApi) {
    log('Installing Fabric API (needed by the PandaClient mod)')
    await installProject(inst.id, 'fabric-api')
  }
}
