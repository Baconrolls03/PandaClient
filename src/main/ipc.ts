import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { totalmem } from 'node:os'
import type { Settings, SystemInfo } from '@shared/types'
import { getSettings, updateSettings } from './services/settings'
import { listVersions } from './services/versions'
import { detectJava } from './services/java'
import * as auth from './services/auth'
import * as launcher from './services/launcher'

const SETTINGS_KEYS: (keyof Settings)[] = ['ramMb', 'javaPath', 'gameDir', 'closeOnLaunch', 'selectedVersion', 'showSnapshots']

export function registerIpc(win: BrowserWindow): void {
  ipcMain.on('window:minimize', () => win.minimize())
  ipcMain.on('window:close', () => win.close())

  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_e, patch: Partial<Settings>) => {
    // Only accept known keys from the renderer.
    const clean: Partial<Settings> = {}
    for (const k of SETTINGS_KEYS) if (k in patch) (clean as Record<string, unknown>)[k] = patch[k]
    return updateSettings(clean)
  })
  ipcMain.handle('settings:pickDirectory', async (_e, current?: string) => {
    const r = await dialog.showOpenDialog(win, { defaultPath: current, properties: ['openDirectory', 'createDirectory'] })
    return r.canceled ? null : r.filePaths[0]
  })
  ipcMain.handle('settings:pickFile', async (_e, current?: string) => {
    const r = await dialog.showOpenDialog(win, {
      defaultPath: current,
      properties: ['openFile'],
      filters: process.platform === 'win32' ? [{ name: 'Java', extensions: ['exe'] }] : []
    })
    return r.canceled ? null : r.filePaths[0]
  })

  ipcMain.handle(
    'system:info',
    (): SystemInfo => ({
      platform: process.platform,
      totalMemMb: Math.floor(totalmem() / 1024 / 1024),
      appVersion: app.getVersion()
    })
  )
  ipcMain.handle('system:detectJava', () => detectJava())
  ipcMain.handle('system:openPath', async (_e, p: string) => {
    await shell.openPath(p)
  })

  ipcMain.handle('versions:list', () => listVersions())

  ipcMain.handle('auth:current', () => auth.currentAccount())
  ipcMain.handle('auth:login', () => auth.login())
  ipcMain.handle('auth:logout', () => auth.logout())

  let launching = false
  ipcMain.handle('game:launch', async (_e, version: string) => {
    if (launching) return
    launching = true
    try {
      await launcher.launch(version, (p) => win.webContents.send('game:progress', p))
    } finally {
      launching = false
    }
  })
}
