// Talks to the PandaClient backend (Supabase edge function "api") for cosmetics and the online count.
import { net } from 'electron'
import type { Cosmetic, IncomingShare, Instance, Loadout, SharePlayer } from '@shared/types'
import { getInstance } from './instances'
import { buildMrpack, importMrpackBuffer } from './mrpack'
import { launchAuth, pandaToken, setPandaToken } from './accounts'

export const PANDA_API = process.env['PANDA_API'] ?? 'https://yljkeadmxsmwiclrbvgp.supabase.co/functions/v1/api'

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const res = await net.fetch(`${PANDA_API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers as Record<string, string>) },
    signal: AbortSignal.timeout(15_000)
  })
  const body = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw Object.assign(new Error(body.error ?? `PandaClient server returned ${res.status}`), { status: res.status })
  return body
}

/**
 * A PandaClient session for the active account. To prove account ownership we "join" a one-time server id
 * with Mojang (like joining a server); our backend then asks Mojang hasJoined. The Minecraft token never
 * leaves for anywhere but Mojang.
 */
async function session(): Promise<string> {
  const auth = await launchAuth()
  const existing = pandaToken(auth.uuid)
  if (existing) return existing
  const { serverId } = await request<{ serverId: string }>('/auth/challenge', { method: 'POST', body: '{}' })
  const join = await net.fetch('https://sessionserver.mojang.com/session/minecraft/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: auth.accessToken, selectedProfile: auth.uuid.replace(/-/g, ''), serverId }),
    signal: AbortSignal.timeout(15_000)
  })
  if (join.status !== 204 && !join.ok) throw new Error("Mojang didn't accept the sign-in check. Try signing out and back in.")
  const { token } = await request<{ token: string }>('/auth/verify', { method: 'POST', body: JSON.stringify({ username: auth.username, serverId }) })
  await setPandaToken(auth.uuid, token)
  return token
}

/** Call an authenticated route, renewing the session once if it expired. */
async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, init, await session())
  } catch (e) {
    if ((e as { status?: number }).status !== 401) throw e
    const auth = await launchAuth()
    await setPandaToken(auth.uuid, null)
    return request<T>(path, init, await session())
  }
}

let catalogCache: { at: number; data: Cosmetic[] } | null = null
export async function catalog(): Promise<Cosmetic[]> {
  if (catalogCache && Date.now() - catalogCache.at < 5 * 60_000) return catalogCache.data
  const data = await request<Cosmetic[]>('/cosmetics')
  catalogCache = { at: Date.now(), data }
  return data
}

export async function loadout(): Promise<Loadout> {
  return (await authed<{ equipped: Loadout }>('/me')).equipped
}

export async function saveLoadout(l: Loadout): Promise<Loadout> {
  return (await authed<{ equipped: Loadout }>('/loadout', { method: 'PUT', body: JSON.stringify({ equipped: l }) })).equipped
}

/* ───────────── Online count (heartbeat every minute while the launcher is open) ───────────── */

let online: number | null = null
const listeners = new Set<(n: number | null) => void>()
export const onlineCount = () => online
export const onOnlineChanged = (fn: (n: number | null) => void) => (listeners.add(fn), () => listeners.delete(fn))

async function beat(): Promise<void> {
  let next: number | null = null
  try {
    next = (await authed<{ online: number }>('/heartbeat', { method: 'POST', body: '{}' })).online
  } catch {
    // Not signed in (or Mojang/our server unreachable): just read the public count.
    next = await request<{ online: number }>('/online')
      .then((r) => r.online)
      .catch(() => null)
  }
  if (next !== null) void pollShares()
  if (next !== online) {
    online = next
    listeners.forEach((l) => l(online))
  }
}

export function startHeartbeat(): void {
  void beat()
  setInterval(() => void beat(), 60_000)
}
export const refreshOnline = () => beat()

/* ───────────── Sharing mod instances ───────────── */

let incoming: IncomingShare[] = []
const shareListeners = new Set<(s: IncomingShare[]) => void>()
export const incomingShares = () => incoming
export const onSharesChanged = (fn: (s: IncomingShare[]) => void) => (shareListeners.add(fn), () => shareListeners.delete(fn))

async function pollShares(): Promise<void> {
  try {
    const next = await authed<IncomingShare[]>('/shares')
    if (JSON.stringify(next.map((s) => s.id)) !== JSON.stringify(incoming.map((s) => s.id))) {
      incoming = next
      shareListeners.forEach((l) => l(incoming))
    } else incoming = next
  } catch {
    /* not signed in / offline */
  }
}

export const searchPlayers = (q: string) => (q.trim() ? authed<SharePlayer[]>(`/players?q=${encodeURIComponent(q.trim())}`) : Promise.resolve([]))

/** Pack the instance, upload it privately and notify the chosen players. Returns how many will see it. */
export async function shareInstance(id: string, to: string[]): Promise<number> {
  const inst = await getInstance(id)
  const data = await buildMrpack(id)
  const start = await authed<{ uploadUrl: string; path: string; recipients: number }>('/shares', {
    method: 'POST',
    body: JSON.stringify({ to, name: inst.name, size: data.length })
  })
  const up = await net.fetch(start.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'x-upsert': 'false' }, body: Buffer.from(data) })
  if (!up.ok) throw new Error(`Upload failed (${up.status})`)
  await authed('/shares/ready', { method: 'POST', body: JSON.stringify({ path: start.path }) })
  return start.recipients
}

export async function dismissShare(id: string): Promise<void> {
  await authed('/shares/dismiss', { method: 'POST', body: JSON.stringify({ id }) })
  incoming = incoming.filter((s) => s.id !== id)
  shareListeners.forEach((l) => l(incoming))
}

/** Download a shared instance and add it to the library. */
export async function acceptShare(id: string): Promise<Instance> {
  if (!incoming.some((s) => s.id === id)) await pollShares()
  const share = incoming.find((s) => s.id === id)
  if (!share) throw new Error('That shared instance is no longer available')
  const res = await net.fetch(share.url)
  if (!res.ok) throw new Error(`Download failed (${res.status})`)
  const inst = await importMrpackBuffer(new Uint8Array(await res.arrayBuffer()))
  await dismissShare(id).catch(() => {})
  return inst
}
