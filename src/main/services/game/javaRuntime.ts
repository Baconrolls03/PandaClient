// Downloads the Java runtime Mojang ships for each Minecraft version (the same one the official launcher uses).
import { existsSync } from 'node:fs'
import { chmod, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { download, getJson, pool } from '../http'
import { safeJoin } from '../paths'
import { getSettings } from '../settings'
import type { TaskHandle } from '../tasks'

const RUNTIMES =
  process.env['PANDA_JAVA_MANIFEST'] ??
  'https://piston-meta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json'

type RuntimeIndex = Record<string, Record<string, { manifest: { sha1: string; url: string }; version: { name: string } }[]>>
interface RuntimeManifest {
  files: Record<string, { type: 'file' | 'directory' | 'link'; executable?: boolean; target?: string; downloads?: { raw: { sha1: string; size: number; url: string } } }>
}

function platformKey(): string {
  const arm = process.arch === 'arm64'
  if (process.platform === 'win32') return arm ? 'windows-arm64' : process.arch === 'ia32' ? 'windows-x86' : 'windows-x64'
  if (process.platform === 'darwin') return arm ? 'mac-os-arm64' : 'mac-os'
  return process.arch === 'ia32' ? 'linux-i386' : 'linux'
}

export function javaExecutable(dir: string): string {
  if (process.platform === 'win32') return join(dir, 'bin', 'javaw.exe')
  if (process.platform === 'darwin') return join(dir, 'jre.bundle', 'Contents', 'Home', 'bin', 'java')
  return join(dir, 'bin', 'java')
}

/** Make sure Mojang's `component` runtime (e.g. java-runtime-delta = Java 21) is installed; returns the java path. */
export async function ensureRuntime(component: string, task: TaskHandle): Promise<string> {
  const dir = join(getSettings().gameDir, 'runtime', component)
  const marker = join(dir, '.panda-version')

  const index = await getJson<RuntimeIndex>(RUNTIMES).catch(() => null)
  const entry = index?.[platformKey()]?.[component]?.[0]
  if (!entry) {
    // Offline or unknown component: use what's installed if anything.
    if (existsSync(javaExecutable(dir))) return javaExecutable(dir)
    throw new Error(index ? `Mojang has no ${component} Java for this system. Set a Java path in Settings.` : "Couldn't reach Mojang to download Java")
  }
  const installed = existsSync(marker) ? (await readFile(marker, 'utf8')).trim() : ''
  if (installed === entry.manifest.sha1 && existsSync(javaExecutable(dir))) return javaExecutable(dir)

  task.update(`Downloading Java ${entry.version.name}`, null)
  await rm(dir, { recursive: true, force: true })
  const manifest = await getJson<RuntimeManifest>(entry.manifest.url)
  const entries = Object.entries(manifest.files)
  for (const [path, f] of entries) if (f.type === 'directory') await mkdir(safeJoin(dir, path), { recursive: true })
  const files = entries.filter(([, f]) => f.type === 'file' && f.downloads)
  let done = 0
  await pool(files, getSettings().maxDownloads, async ([path, f]) => {
    const dest = safeJoin(dir, path)
    await download(f.downloads!.raw.url, dest, { sha1: f.downloads!.raw.sha1 })
    if (f.executable && process.platform !== 'win32') await chmod(dest, 0o755)
    done++
    if (done % 20 === 0 || done === files.length) task.update(`Downloading Java ${entry.version.name} (${done}/${files.length})`, done / files.length)
  })
  if (process.platform !== 'win32') {
    for (const [path, f] of entries) {
      if (f.type !== 'link' || !f.target) continue
      const dest = safeJoin(dir, path)
      await mkdir(dirname(dest), { recursive: true })
      await symlink(f.target, dest).catch(() => {})
    }
  }
  await writeFile(marker, entry.manifest.sha1)
  return javaExecutable(dir)
}
