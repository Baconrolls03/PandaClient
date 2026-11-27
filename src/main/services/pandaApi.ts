// Talks to the PandaClient backend (Supabase edge function "api") for cosmetics and the online count.
import { net } from 'electron'
import { existsSync, readFileSync } from 'node:fs'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Cosmetic, Friend, IncomingShare, Instance, Invite, Loadout, SharePlayer } from '@shared/types'
import { getSettings } from './settings'
import { runningInstances } from './game/launch'
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
    next = (await authed<{ online: number }>('/heartbeat', { method: 'POST', body: JSON.stringify({ server: currentServer() }) })).online
  } catch {
    // Not signed in (or Mojang/our server unreachable): just read the public count.
    next = await request<{ online: number }>('/online')
      .then((r) => r.online)
      .catch(() => null)
  }
  if (next !== null) void pollShares().then(pollInvites)
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

/* ───────────── Presence + friends ───────────── */

/** The server the PandaClient mod says you're on (it writes this file next to its settings). */
function currentServer(): string | null {
  try {
    if (!runningInstances().length) return null
    const file = join(getSettings().gameDir, 'pandaclient-presence.json')
    if (!existsSync(file)) return null
    const p = JSON.parse(readFileSync(file, 'utf8')) as { server?: string; updated?: number }
    return p.server && Date.now() - (p.updated ?? 0) < 30 * 60_000 ? p.server.slice(0, 100) : null
  } catch {
    return null
  }
}

export const friends = () => authed<Friend[]>('/friends')
export const addFriend = (username: string) => authed<{ status: string; username: string }>('/friends/add', { method: 'POST', body: JSON.stringify({ username }) })
export const acceptFriend = (uuid: string) => authed('/friends/accept', { method: 'POST', body: JSON.stringify({ uuid }) })
export const removeFriend = (uuid: string) => authed('/friends/remove', { method: 'POST', body: JSON.stringify({ uuid }) })

/* ───────────── Party invites ───────────── */

let invites: Invite[] = []
const inviteListeners = new Set<(i: Invite[]) => void>()
export const pendingInvites = () => invites
export const onInvitesChanged = (fn: (i: Invite[]) => void) => (inviteListeners.add(fn), () => inviteListeners.delete(fn))
async function pollInvites(): Promise<void> {
  try {
    const next = await authed<Invite[]>('/invites')
    const changed = next.map((i) => i.id).join() !== invites.map((i) => i.id).join()
    invites = next
    if (changed) inviteListeners.forEach((l) => l(invites))
  } catch {
    /* offline */
  }
}
/** Invite a friend to the server you're on right now. */
export async function inviteFriend(uuid: string): Promise<string> {
  const server = currentServer()
  if (!server || server === 'Singleplayer') throw new Error('Join a server first, then invite friends to it')
  await authed('/invites', { method: 'POST', body: JSON.stringify({ to: uuid, server }) })
  return server
}
export async function dismissInvite(id: string): Promise<void> {
  await authed('/invites/dismiss', { method: 'POST', body: JSON.stringify({ id }) })
  invites = invites.filter((i) => i.id !== id)
  inviteListeners.forEach((l) => l(invites))
}
export const myServer = () => currentServer()

/* ───────────── Settings sync ───────────── */

/** PandaClient's in-game settings files in the game folder (shared by every profile). */
async function settingsFiles(): Promise<{ name: string; path: string; mtime: number }[]> {
  const dir = getSettings().gameDir
  if (!existsSync(dir)) return []
  const out = []
  for (const name of await readdir(dir)) {
    if (!/^pandaclient[a-z0-9_.-]*\.json$/i.test(name) || name === 'pandaclient-presence.json') continue
    const s = await stat(join(dir, name)).catch(() => null)
    if (s?.isFile() && s.size < 256_000) out.push({ name, path: join(dir, name), mtime: s.mtimeMs })
  }
  return out
}
const syncStamp = () => join(getSettings().gameDir, '.pandaclient-sync')
async function lastSync(): Promise<number> {
  return Number(await readFile(syncStamp(), 'utf8').catch(() => '0')) || 0
}

/** Before launch: take the cloud copy if it's newer than what's on this PC. */
export async function pullSettings(): Promise<boolean> {
  if (!getSettings().cloudSync) return false
  const remote = await authed<{ files: Record<string, string>; updatedAt: string | null }>('/settings')
  if (!remote.updatedAt) return false
  const at = Date.parse(remote.updatedAt)
  const local = await settingsFiles()
  const newestLocal = Math.max(0, ...local.map((f) => f.mtime))
  if (at <= (await lastSync()) || at <= newestLocal) return false
  for (const [name, text] of Object.entries(remote.files)) {
    if (/^pandaclient[a-z0-9_.-]*\.json$/i.test(name)) await writeFile(join(getSettings().gameDir, name), text)
  }
  await writeFile(syncStamp(), String(Date.now()))
  return true
}

/** After playing: upload the settings if they changed. */
export async function pushSettings(): Promise<boolean> {
  if (!getSettings().cloudSync) return false
  const local = await settingsFiles()
  if (!local.length || Math.max(...local.map((f) => f.mtime)) <= (await lastSync())) return false
  const files: Record<string, string> = {}
  for (const f of local) files[f.name] = await readFile(f.path, 'utf8')
  await authed('/settings', { method: 'PUT', body: JSON.stringify({ files }) })
  await writeFile(syncStamp(), String(Date.now()))
  return true
}
