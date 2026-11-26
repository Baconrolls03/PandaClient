import { app, net } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { VersionInfo, VersionList } from '@shared/types'

const MOJANG_MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
const FABRIC_GAME = 'https://meta.fabricmc.net/v2/versions/game'

interface MojangManifest {
  latest: { release: string; snapshot: string }
  versions: { id: string; type: VersionInfo['type']; releaseTime: string }[]
}

const cacheFile = () => join(app.getPath('userData'), 'versions-cache.json')

async function getJson<T>(url: string, timeoutMs = 10_000): Promise<T> {
  const res = await net.fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  return (await res.json()) as T
}

let memo: VersionList | null = null

export async function listVersions(): Promise<VersionList> {
  if (memo && !memo.offline) return memo
  try {
    const [manifest, fabric] = await Promise.all([
      getJson<MojangManifest>(MOJANG_MANIFEST),
      getJson<{ version: string }[]>(FABRIC_GAME).catch(() => [] as { version: string }[])
    ])
    const fabricIds = new Set(fabric.map((v) => v.version))
    memo = {
      latestRelease: manifest.latest.release,
      offline: false,
      versions: manifest.versions.map((v) => ({
        id: v.id,
        type: v.type,
        releaseTime: v.releaseTime,
        fabric: fabricIds.has(v.id)
      }))
    }
    writeFile(cacheFile(), JSON.stringify(memo)).catch(() => {})
    return memo
  } catch {
    try {
      const cached = JSON.parse(await readFile(cacheFile(), 'utf8')) as VersionList
      memo = { ...cached, offline: true }
    } catch {
      memo = { versions: [], latestRelease: '', offline: true }
    }
    return memo
  }
}
