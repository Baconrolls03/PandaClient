// Microsoft accounts via msmc (the same sign-in flow the official launcher uses).
// Refresh tokens are encrypted with the OS keychain (Electron safeStorage) before touching disk.
import { app, safeStorage } from 'electron'
import { existsSync, readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Auth } from 'msmc'
import type { Account } from '@shared/types'

interface Stored {
  uuid: string
  username: string
  refresh: string // encrypted, base64
  mc?: { token: string; exp: number } // encrypted access token cache
  panda?: string // encrypted PandaClient session token
}
interface Store {
  active: string | null
  accounts: Stored[]
}

const file = () => join(app.getPath('userData'), 'accounts.json')

function seal(text: string): string {
  return safeStorage.isEncryptionAvailable() ? `enc:${safeStorage.encryptString(text).toString('base64')}` : `b64:${Buffer.from(text).toString('base64')}`
}
function unseal(text: string): string {
  if (text.startsWith('enc:')) return safeStorage.decryptString(Buffer.from(text.slice(4), 'base64'))
  return Buffer.from(text.replace(/^b64:/, ''), 'base64').toString('utf8')
}

function load(): Store {
  try {
    if (existsSync(file())) return JSON.parse(readFileSync(file(), 'utf8')) as Store
  } catch {
    /* corrupt: start over */
  }
  return { active: null, accounts: [] }
}
const save = (s: Store) => writeFile(file(), JSON.stringify(s, null, 2))

const view = (s: Store): Account[] => s.accounts.map((a) => ({ uuid: a.uuid, username: a.username, active: a.uuid === s.active }))

/** Turn msmc's error codes into something a person can act on. */
function friendly(e: unknown): Error {
  const code = typeof e === 'string' ? e : e instanceof Error ? e.message : String((e as { ts?: string })?.ts ?? e)
  const map: Record<string, string> = {
    'error.gui.closed': 'Sign-in was cancelled.',
    'error.auth.xsts.userNotFound': "This Microsoft account doesn't have an Xbox profile yet. Sign in once at minecraft.net, then try again.",
    'error.auth.xsts.bannedCountry': "Xbox Live isn't available in this account's country.",
    'error.auth.xsts.child': 'This is a child account. An adult needs to add it to a Microsoft family first.',
    'error.auth.xsts.child.SK': 'South Korean accounts need adult verification on xbox.com first.',
    'error.auth.minecraft.profile': "This account doesn't own Minecraft: Java Edition, or hasn't picked a username yet.",
    'error.auth.minecraft.entitlements': "This account doesn't own Minecraft: Java Edition."
  }
  const key = Object.keys(map).find((k) => code.startsWith(k))
  return new Error(key ? map[key] : `Sign-in failed (${code}).`)
}

export async function listAccounts(): Promise<Account[]> {
  return view(load())
}

export async function login(): Promise<Account> {
  const auth = new Auth('select_account')
  let mc
  let refresh: string
  try {
    const xbox = await auth.launch('electron', {
      width: 520,
      height: 680,
      resizable: false,
      title: 'Sign in to Minecraft',
      backgroundColor: '#0F141C',
      autoHideMenuBar: true
    } as never)
    mc = await xbox.getMinecraft()
    refresh = xbox.save()
  } catch (e) {
    throw friendly(e)
  }
  if (!mc.profile) throw friendly('error.auth.minecraft.profile')
  const store = load()
  const entry: Stored = {
    uuid: mc.profile.id,
    username: mc.profile.name,
    refresh: seal(refresh),
    mc: { token: seal(mc.mcToken), exp: mc.exp }
  }
  store.accounts = [...store.accounts.filter((a) => a.uuid !== entry.uuid), entry]
  store.active = entry.uuid
  await save(store)
  return { uuid: entry.uuid, username: entry.username, active: true }
}

export async function logout(uuid: string): Promise<Account[]> {
  const store = load()
  store.accounts = store.accounts.filter((a) => a.uuid !== uuid)
  if (store.active === uuid) store.active = store.accounts[0]?.uuid ?? null
  await save(store)
  return view(store)
}

export async function setActive(uuid: string): Promise<Account[]> {
  const store = load()
  if (store.accounts.some((a) => a.uuid === uuid)) store.active = uuid
  await save(store)
  return view(store)
}

export interface LaunchAuth {
  uuid: string
  username: string
  accessToken: string
  xuid: string
}

/** A valid Minecraft access token for the active account, refreshing it when it's close to expiring. */
export async function launchAuth(): Promise<LaunchAuth> {
  const store = load()
  const acc = store.accounts.find((a) => a.uuid === store.active)
  if (!acc) throw new Error('Sign in with a Microsoft account to play.')
  const soon = Date.now() + 10 * 60_000
  if (acc.mc && acc.mc.exp > soon) {
    const token = unseal(acc.mc.token)
    return { uuid: acc.uuid, username: acc.username, accessToken: token, xuid: xuidOf(token) }
  }
  try {
    const xbox = await new Auth('select_account').refresh(unseal(acc.refresh))
    const mc = await xbox.getMinecraft()
    acc.refresh = seal(xbox.save())
    acc.mc = { token: seal(mc.mcToken), exp: mc.exp }
    if (mc.profile) acc.username = mc.profile.name
    await save(store)
    return { uuid: acc.uuid, username: acc.username, accessToken: mc.mcToken, xuid: mc.xuid }
  } catch (e) {
    const err = friendly(e)
    throw new Error(`Couldn't refresh ${acc.username}'s sign-in. Sign out and back in. (${err.message})`)
  }
}

/** The xuid is inside the Minecraft token (a JWT). */
function xuidOf(token: string): string {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).xuid ?? ''
  } catch {
    return ''
  }
}

/* ───────────── PandaClient session (for cosmetics) ───────────── */

export function pandaToken(uuid: string): string | null {
  const acc = load().accounts.find((a) => a.uuid === uuid)
  try {
    return acc?.panda ? unseal(acc.panda) : null
  } catch {
    return null
  }
}

export async function setPandaToken(uuid: string, token: string | null): Promise<void> {
  const store = load()
  const acc = store.accounts.find((a) => a.uuid === uuid)
  if (!acc) return
  if (token) acc.panda = seal(token)
  else delete acc.panda
  await save(store)
}
