import type { Loader, LoaderVersion } from '@shared/types'
import { getJson, getText } from './http'

const FABRIC = process.env['PANDA_FABRIC_META'] ?? 'https://meta.fabricmc.net/v2'
const QUILT = 'https://meta.quiltmc.org/v3'
const FORGE_MAVEN = 'https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml'
const NEOFORGE_API = 'https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge'

/** Compare dotted version strings numerically, newest first. */
function byVersionDesc(a: string, b: string): number {
  const pa = a.split(/[.-]/).map((n) => parseInt(n, 10) || 0)
  const pb = b.split(/[.-]/).map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pb[i] ?? 0) - (pa[i] ?? 0)
    if (d) return d
  }
  return 0
}

/** NeoForge versions encode the game version: MC 1.21.1 → 21.1.x, MC 26.1 → 26.1.x. */
function neoforgePrefix(mc: string): string {
  const parts = mc.split('.')
  if (parts[0] === '1') return `${parts[1]}.${parts[2] ?? '0'}.`
  return `${mc}.`
}

export async function loaderVersions(loader: Loader, mc: string): Promise<LoaderVersion[]> {
  switch (loader) {
    case 'vanilla':
      return []
    case 'fabric': {
      const list = await getJson<{ loader: { version: string; stable: boolean } }[]>(`${FABRIC}/versions/loader/${encodeURIComponent(mc)}`)
      return list.map((l) => ({ version: l.loader.version, stable: l.loader.stable }))
    }
    case 'quilt': {
      const list = await getJson<{ loader: { version: string } }[]>(`${QUILT}/versions/loader/${encodeURIComponent(mc)}`)
      // Quilt's meta isn't sorted newest-first.
      return list
        .map((l) => l.loader.version)
        .sort(byVersionDesc)
        .map((version) => ({ version, stable: !/beta|alpha|pre|rc/i.test(version) }))
    }
    case 'forge': {
      const xml = await getText(FORGE_MAVEN)
      const prefix = `${mc}-`
      return [...xml.matchAll(/<version>([^<]+)<\/version>/g)]
        .map((m) => m[1])
        .filter((v) => v.startsWith(prefix))
        .map((v) => v.slice(prefix.length))
        .sort(byVersionDesc)
        .map((version) => ({ version, stable: true }))
    }
    case 'neoforge': {
      const { versions } = await getJson<{ versions: string[] }>(NEOFORGE_API)
      const prefix = neoforgePrefix(mc)
      return versions
        .filter((v) => v.startsWith(prefix))
        .sort(byVersionDesc)
        .map((version) => ({ version, stable: !/beta|alpha/i.test(version) }))
    }
  }
}

/** Loader ids to use when asking Modrinth for mods compatible with an instance. */
export function modLoadersFor(loader: Loader): string[] {
  switch (loader) {
    case 'quilt':
      return ['quilt', 'fabric']
    case 'vanilla':
      return []
    default:
      return [loader]
  }
}
