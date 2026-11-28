// Talks to the PandaClient backend (Supabase edge function "api") for cosmetics and the online count.
import { net } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Cosmetic, Friend, IncomingShare, Instance, Invite, Loadout, PartyState, SharePlayer } from '@shared/types'
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
  if (next !== null) void pollShares().then(pollInvites).then(pollParty)
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

/* ───────────── Lobby party ───────────── */

let party: PartyState = { party: null, invites: [], messages: [] }
let lastMsgId = 0
let partyId: string | null = null
const partyListeners = new Set<(p: PartyState) => void>()
export const partyState = () => party
export const onPartyChanged = (fn: (p: PartyState) => void) => (partyListeners.add(fn), () => partyListeners.delete(fn))

/** Friends for the in-game lobby's invite list (refreshed every 30 s while the game is open). */
let friendList: Friend[] = []
let friendsAt = 0
/** A short message for the game to show (e.g. why an invite didn't work). */
let notice: { text: string; at: number } | null = null

/**
 * The in-game lobby reads this file: your party (names, leader, where everyone is), party chat, your invites
 * and friends you can invite. The game asks for things (invite, chat, leave...) by dropping small files in
 * .pandaclient-cmd, which the launcher carries out with your PandaClient session.
 */
function writePartyFile(): void {
  try {
    const dir = getSettings().gameDir
    if (!existsSync(dir)) return
    const members = party.party?.members ?? []
    const out = {
      updated: Date.now(),
      me: party.me ?? null,
      leader: party.party?.leader ?? null,
      members: members.map((m) => ({ uuid: m.uuid, name: m.username, leader: m.leader, online: m.online, server: m.server, serverAt: m.serverAt ?? null })),
      invites: party.invites.map((i) => ({ id: i.id, from: i.from })),
      messages: (party.messages ?? []).slice(-50).map((m) => ({ id: m.id, from: m.from, fromUuid: m.fromUuid, text: m.text, at: Date.parse(m.at) || 0 })),
      friends: friendList
        .filter((f) => f.status === 'friends')
        .map((f) => ({ uuid: f.uuid, name: f.username, online: f.online, server: f.server ?? null, inParty: members.some((m) => m.uuid === f.uuid) })),
      notice
    }
    const file = join(dir, 'pandaclient-party.json')
    writeFileSync(file + '.tmp', JSON.stringify(out))
    renameSync(file + '.tmp', file)
  } catch {
    /* game folder not ready */
  }
}

export async function pollParty(): Promise<PartyState> {
  try {
    let next = await authed<PartyState>(`/party?after=${lastMsgId}`)
    const nextId = next.party?.id ?? null
    if (nextId !== partyId) {
      // joined, left or switched party: start the chat over
      partyId = nextId
      lastMsgId = 0
      party = { ...party, messages: [] }
      if (nextId) next = await authed<PartyState>('/party?after=0')
    }
    const seen = new Set((party.messages ?? []).map((m) => m.id))
    const messages = [...(party.messages ?? []), ...(next.messages ?? []).filter((m) => !seen.has(m.id))].slice(-50)
    lastMsgId = messages.reduce((mx, m) => Math.max(mx, m.id), lastMsgId)
    const merged: PartyState = { ...next, messages }
    const changed = JSON.stringify(merged) !== JSON.stringify(party)
    party = merged
    if (changed) {
      partyListeners.forEach((l) => l(party))
      writePartyFile()
    }
  } catch {
    /* offline or signed out */
  }
  return party
}

const fail = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

/** Carry out what the game asked for (lobby invite buttons, party chat, ...). */
async function runGameCommands(): Promise<boolean> {
  const dir = join(getSettings().gameDir, '.pandaclient-cmd')
  if (!existsSync(dir)) return false
  const names = (await readdir(dir).catch(() => [] as string[])).filter((n) => n.endsWith('.json')).sort()
  let did = false
  for (const name of names.slice(0, 20)) {
    const file = join(dir, name)
    let cmd: { type?: string; uuid?: string; id?: string; text?: string } = {}
    try {
      cmd = JSON.parse(await readFile(file, 'utf8'))
    } catch {
      /* half-written: try again next time unless it's old */
      const s = await stat(file).catch(() => null)
      if (s && Date.now() - s.mtimeMs < 10_000) continue
    }
    await unlink(file).catch(() => {})
    did = true
    try {
      switch (cmd.type) {
        case 'invite': if (cmd.uuid) await authed('/party/invite', { method: 'POST', body: JSON.stringify({ to: cmd.uuid }) }); break
        case 'accept': if (cmd.id) await authed('/party/accept', { method: 'POST', body: JSON.stringify({ id: cmd.id }) }); break
        case 'decline': if (cmd.id) await authed('/party/decline', { method: 'POST', body: JSON.stringify({ id: cmd.id }) }); break
        case 'leave': await authed('/party/leave', { method: 'POST', body: '{}' }); break
        case 'kick': if (cmd.uuid) await authed('/party/kick', { method: 'POST', body: JSON.stringify({ uuid: cmd.uuid }) }); break
        case 'promote': if (cmd.uuid) await authed('/party/promote', { method: 'POST', body: JSON.stringify({ uuid: cmd.uuid }) }); break
        case 'chat': if (cmd.text) await authed('/party/chat', { method: 'POST', body: JSON.stringify({ text: cmd.text }) }); break
        default: break
      }
    } catch (e) {
      notice = { text: fail(e), at: Date.now() }
    }
  }
  return did
}

/** Tell the party as soon as you join or leave a server (so they can follow you). */
let sentServer: string | null | undefined
async function reportServer(): Promise<void> {
  const server = currentServer()
  if (server === sentServer) return
  try {
    await authed('/party/presence', { method: 'POST', body: JSON.stringify({ server }) })
    sentServer = server
  } catch {
    /* offline: try again next time */
  }
}

// While the game is open: carry out its requests, report where you are and keep the party fresh
// (every 2.5 s in a party, every 10 s otherwise).
let gameTicks = 0
let gameBusy = false
async function gameLoop(): Promise<void> {
  if (gameBusy) return
  gameBusy = true
  try {
    const did = await runGameCommands()
    await reportServer()
    if (did || party.party || gameTicks % 4 === 0) await pollParty()
    if (Date.now() - friendsAt > 30_000) {
      friendsAt = Date.now()
      friendList = await friends().catch(() => friendList)
    }
    if (notice && Date.now() - notice.at > 15_000) notice = null
    writePartyFile()
    gameTicks++
  } finally {
    gameBusy = false
  }
}
setInterval(() => {
  if (runningInstances().length) void gameLoop()
  else sentServer = undefined
}, 2500)

export async function partyInvite(uuid: string): Promise<void> {
  await authed('/party/invite', { method: 'POST', body: JSON.stringify({ to: uuid }) })
  await pollParty()
}
export async function partyAccept(id: string): Promise<void> {
  await authed('/party/accept', { method: 'POST', body: JSON.stringify({ id }) })
  await pollParty()
}
export async function partyDecline(id: string): Promise<void> {
  await authed('/party/decline', { method: 'POST', body: JSON.stringify({ id }) })
  await pollParty()
}
export async function partyLeave(): Promise<void> {
  await authed('/party/leave', { method: 'POST', body: '{}' })
  await pollParty()
}
export async function partyKick(uuid: string): Promise<void> {
  await authed('/party/kick', { method: 'POST', body: JSON.stringify({ uuid }) })
  await pollParty()
}
export async function partyPromote(uuid: string): Promise<void> {
  await authed('/party/promote', { method: 'POST', body: JSON.stringify({ uuid }) })
  await pollParty()
}
export async function partyChat(text: string): Promise<void> {
  await authed('/party/chat', { method: 'POST', body: JSON.stringify({ text: text.slice(0, 200) }) })
  await pollParty()
}

/* ───────────── Settings sync ───────────── */

/** PandaClient's in-game settings files in the game folder (shared by every profile). */
async function settingsFiles(): Promise<{ name: string; path: string; mtime: number }[]> {
  const dir = getSettings().gameDir
  if (!existsSync(dir)) return []
  const out = []
  for (const name of await readdir(dir)) {
    if (!/^pandaclient[a-z0-9_.-]*\.json$/i.test(name) || name === 'pandaclient-presence.json' || name === 'pandaclient-party.json') continue
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
