import { execFile } from 'node:child_process'
import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import type { JavaInstall } from '@shared/types'

const run = promisify(execFile)
const isWin = process.platform === 'win32'
const exe = isWin ? 'java.exe' : 'java'

/** Run `java -version` and parse e.g. `"21.0.3"` or `"1.8.0_392"`. */
async function probe(path: string): Promise<{ version: string; major: number } | null> {
  try {
    const { stderr, stdout } = await run(path, ['-version'], { timeout: 5000, windowsHide: true })
    const m = /version "([^"]+)"/.exec(stderr || stdout)
    if (!m) return null
    const version = m[1]
    const parts = version.split(/[._-]/).map(Number)
    const major = parts[0] === 1 ? parts[1] : parts[0]
    return { version, major }
  } catch {
    return null
  }
}

/** Find bin/java under `root`, a few levels deep (JDK folders, Mojang runtime folders). */
function scan(root: string, depth = 4, out: string[] = []): string[] {
  if (depth < 0 || !existsSync(root)) return out
  const candidate = join(root, 'bin', exe)
  if (existsSync(candidate)) {
    out.push(candidate)
    return out
  }
  let entries: string[] = []
  try {
    entries = readdirSync(root)
  } catch {
    return out
  }
  for (const e of entries) {
    const p = join(root, e)
    try {
      if (statSync(p).isDirectory()) scan(p, depth - 1, out)
    } catch {
      /* unreadable */
    }
  }
  return out
}

async function onPath(): Promise<string[]> {
  try {
    const { stdout } = await run(isWin ? 'where' : 'which', isWin ? ['java'] : ['-a', 'java'], {
      timeout: 3000,
      windowsHide: true
    })
    return stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  } catch {
    return []
  }
}

function systemRoots(): { root: string; source: JavaInstall['source'] }[] {
  const roots: { root: string; source: JavaInstall['source'] }[] = []
  if (isWin) {
    for (const pf of [process.env['ProgramFiles'], process.env['ProgramFiles(x86)']]) {
      if (!pf) continue
      for (const vendor of ['Java', 'Eclipse Adoptium', 'Microsoft', 'Zulu', 'BellSoft', 'Amazon Corretto']) {
        roots.push({ root: join(pf, vendor), source: 'system' })
      }
    }
    const local = process.env['LOCALAPPDATA']
    const appdata = process.env['APPDATA']
    // Official Minecraft Launcher runtimes (Store/MSIX and classic installs).
    if (local)
      roots.push({
        root: join(local, 'Packages', 'Microsoft.4297127D64EC6_8wekyb3d8bbwe', 'LocalCache', 'Local', 'runtime'),
        source: 'minecraft-runtime'
      })
    if (appdata) roots.push({ root: join(appdata, '.minecraft', 'runtime'), source: 'minecraft-runtime' })
  } else if (process.platform === 'darwin') {
    roots.push({ root: '/Library/Java/JavaVirtualMachines', source: 'system' })
    roots.push({ root: join(homedir(), 'Library', 'Application Support', 'minecraft', 'runtime'), source: 'minecraft-runtime' })
  } else {
    roots.push({ root: '/usr/lib/jvm', source: 'system' })
    roots.push({ root: join(homedir(), '.minecraft', 'runtime'), source: 'minecraft-runtime' })
  }
  return roots
}

export async function detectJava(): Promise<JavaInstall[]> {
  const candidates: { path: string; source: JavaInstall['source'] }[] = []
  const javaHome = process.env['JAVA_HOME']
  if (javaHome) candidates.push({ path: join(javaHome, 'bin', exe), source: 'JAVA_HOME' })
  for (const p of await onPath()) candidates.push({ path: p, source: 'PATH' })
  for (const { root, source } of systemRoots()) for (const p of scan(root)) candidates.push({ path: p, source })

  const seen = new Set<string>()
  const results: JavaInstall[] = []
  for (const c of candidates) {
    if (!existsSync(c.path)) continue
    let real = c.path
    try {
      real = realpathSync(c.path)
    } catch {
      /* keep as is */
    }
    if (seen.has(real)) continue
    seen.add(real)
    const info = await probe(c.path)
    if (!info) continue
    // On Windows prefer javaw.exe so the game doesn't open a console window.
    const javaw = join(dirname(c.path), 'javaw.exe')
    results.push({ path: isWin && existsSync(javaw) ? javaw : c.path, source: c.source, ...info })
  }
  return results.sort((a, b) => b.major - a.major)
}
