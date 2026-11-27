import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import type { Instance } from '@shared/types'
import { installProject, listContent } from './content'
import { download, sha1File } from './http'

/** Minecraft versions the PandaClient mod is built for (one jar per version: resources/mods/pandaclient-<mc>.jar). */
export const PANDA_MOD_VERSIONS = ['1.21.11', '1.21.10', '1.21.9']
const JAR = 'pandaclient.jar'
const FABRIC_API_ID = 'P7dR8mSH'

/** The mod jar for this Minecraft version shipped inside the installer (resources/mods), or a local build in development. */
export function bundledJar(mc = '1.21.11'): string | null {
  const dir = app.isPackaged ? join(process.resourcesPath, 'mods') : join(app.getAppPath(), 'build', 'mods')
  // pandaclient.jar = 1.21.11 (older installers and the dev build)
  const candidates = [join(dir, `pandaclient-${mc}.jar`), ...(mc === '1.21.11' ? [join(dir, JAR)] : [])]
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
  await mkdir(mods, { recursive: true })
  let src = bundledJar(inst.mcVersion)
  if (!src) {
    // Not found next to the app (unusual install): fetch the copy published with this launcher version.
    src = join(app.getPath('userData'), `pandaclient-mod-${inst.mcVersion}.jar`)
    log('Downloading the PandaClient mod')
    await download(`https://github.com/Baconrolls03/PandaClient/releases/download/v${app.getVersion()}/pandaclient-mod-${inst.mcVersion}.jar`, src)
  }
  // Remove copies the user may have added under another name, and a disabled copy.
  for (const f of await readdir(mods)) {
    if (f !== JAR && /^pandaclient.*\.jar(\.disabled)?$/i.test(f)) await rm(join(mods, f), { force: true })
  }
  log('Adding the PandaClient mod')
  if (!existsSync(target) || (await sha1File(target)) !== (await sha1File(src))) await copyFile(src, target)
  if (!existsSync(target)) throw new Error(`Could not add the PandaClient mod to ${mods}`)
  const items = await listContent(inst.id)
  const hasFabricApi = items.some(
    (i) => i.type === 'mod' && i.enabled && (i.project?.id === FABRIC_API_ID || i.project?.slug === 'fabric-api' || /^fabric-api/i.test(i.file))
  )
  if (!hasFabricApi) {
    log('Installing Fabric API (needed by the PandaClient mod)')
    await installProject(inst.id, 'fabric-api')
  }
}
