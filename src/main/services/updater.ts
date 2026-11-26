// Self-updates from GitHub Releases (electron-updater). Downloads in the background; the UI offers "Restart to update".
import { app } from 'electron'
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
  setInterval(() => void check(), 2 * 60 * 60_000)
}

export async function check(): Promise<UpdateState> {
  if (!app.isPackaged) return state
  if (state.status === 'downloading' || state.status === 'ready') return state
  try {
    await autoUpdater.checkForUpdates()
  } catch (e) {
    set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
  }
  return state
}

export function install(): void {
  if (state.status === 'ready') autoUpdater.quitAndInstall(false, true)
}
