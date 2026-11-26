import type { LoaderVersion } from '@shared/types'
import { getJson } from './http'

const FABRIC = process.env['PANDA_FABRIC_META'] ?? 'https://meta.fabricmc.net/v2'

/** Modrinth loader ids that PandaClient instances can run. */
export const MOD_LOADERS = ['fabric']

/** Fabric loader versions for a game version, newest first. */
export async function fabricVersions(mc: string): Promise<LoaderVersion[]> {
  const list = await getJson<{ loader: { version: string; stable: boolean } }[]>(`${FABRIC}/versions/loader/${encodeURIComponent(mc)}`)
  return list.map((l) => ({ version: l.loader.version, stable: l.loader.stable }))
}

export async function latestStableFabric(mc: string): Promise<string | null> {
  const list = await fabricVersions(mc)
  return (list.find((l) => l.stable) ?? list[0])?.version ?? null
}
