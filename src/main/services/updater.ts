// Self-updates from GitHub Releases (electron-updater). Downloads in the background; the UI offers "Restart to update".
import { app, net, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateState } from '@shared/types'

let state: UpdateState = { status: app.isPackaged ? 'idle' : 'unsupported', current: app.getVersion() }
const listeners = new Set<(s: UpdateState) => void>()
const set = (patch: Partial<UpdateState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l(state))
}

export const updateState = () => state
export const onUpdateChanged = (fn: (s: UpdateState) => void) => (listeners.add(fn), () => listeners.delete(fn))

export function startUpdater(): void {
  // Only installed builds can update themselves (not `npm run dev`).
  if (!app.isPackaged) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('checking-for-update', () => set({ status: 'checking', error: undefined }))
  autoUpdater.on('update-not-available', () => set({ status: 'none', checkedAt: Date.now() }))
  autoUpdater.on('update-available', (info) =>
    set({ status: 'downloading', version: info.version, progress: 0, notes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined })
  )
  autoUpdater.on('download-progress', (p) => set({ status: 'downloading', progress: p.percent / 100 }))
  autoUpdater.on('update-downloaded', (info) => set({ status: 'ready', version: info.version, progress: 1 }))
  autoUpdater.on('error', (e) => set({ status: 'error', error: e?.message ?? String(e) }))
  setTimeout(() => void check(), 5_000)
  setInterval(() => void check(), 15 * 60_000)
}

let lastCheck = 0
/** When the window comes back into focus: check again if it's been a few minutes. */
export function checkSoon(): void {
  if (Date.now() - lastCheck > 5 * 60_000) void check()
}

const newer = (a: string, b: string) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  return false
}

/** The newest release on GitHub, straight from the API (works even when the updater itself fails). */
async function latestRelease(): Promise<{ version: string; url: string } | null> {
  try {
    const res = await net.fetch('https://api.github.com/repos/Baconrolls03/PandaClient/releases/latest', { headers: { 'User-Agent': 'PandaClient', Accept: 'application/vnd.github+json' } })
    if (!res.ok) return null
    const r = (await res.json()) as { tag_name?: string; html_url?: string; assets?: { name: string; browser_download_url: string }[] }
    const version = (r.tag_name ?? '').replace(/^v/, '')
    if (!version) return null
    const exe = r.assets?.find((a) => /\.exe$/i.test(a.name))
    return { version, url: exe?.browser_download_url ?? r.html_url ?? 'https://github.com/Baconrolls03/PandaClient/releases/latest' }
  } catch {
    return null
  }
}

export async function check(): Promise<UpdateState> {
  if (!app.isPackaged) return state
  if (state.status === 'downloading' || state.status === 'ready') return state
  lastCheck = Date.now()
  try {
    await autoUpdater.checkForUpdates()
  } catch (e) {
    set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
  }
  // If the automatic update didn't start (an error, or it thinks there's nothing new), ask GitHub directly
  // so a new version is always shown, with a download button.
  if (state.status === 'error' || state.status === 'none' || state.status === 'available') {
    const latest = await latestRelease()
    if (latest && newer(latest.version, app.getVersion())) set({ status: 'available', version: latest.version, url: latest.url })
  }
  return state
}

export function install(): void {
  if (state.status === 'ready') autoUpdater.quitAndInstall(false, true)
  else if (state.status === 'available' && state.url) void shell.openExternal(state.url)
}
