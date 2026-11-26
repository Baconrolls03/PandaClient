import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { totalmem } from 'node:os'
import type { CreateInstanceInput, Settings, SystemInfo } from '@shared/types'
import { getSettings, updateSettings } from './services/settings'
import { listVersions } from './services/versions'
import { loaderVersions } from './services/loaders'
import { detectJava } from './services/java'
import * as instances from './services/instances'
import * as content from './services/content'
import * as files from './services/instanceFiles'
import * as mrpack from './services/mrpack'
import * as mr from './services/modrinth'
import * as tasks from './services/tasks'
import * as auth from './services/auth'
import * as launcher from './services/launcher'
import { safeJoin } from './services/paths'

const SETTINGS_KEYS: (keyof Settings)[] = ['ramMb', 'javaPath', 'gameDir', 'closeOnLaunch', 'selectedInstance', 'showSnapshots', 'maxDownloads']

const FILE_FILTERS: Record<string, Electron.FileFilter[]> = {
  java: process.platform === 'win32' ? [{ name: 'Java', extensions: ['exe'] }] : [],
  image: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
  mrpack: [{ name: 'Modrinth modpack', extensions: ['mrpack'] }],
  content: [{ name: 'Mods & packs', extensions: ['jar', 'zip'] }]
}

async function createInstance(input: CreateInstanceInput) {
  let loaderVersion = input.loaderVersion
  if (!loaderVersion && input.loader !== 'vanilla') {
    const list = await loaderVersions(input.loader, input.mcVersion).catch(() => [])
    loaderVersion = (list.find((l) => l.stable) ?? list[0])?.version ?? null
  }
  const inst = await instances.createInstance({ ...input, loaderVersion })
  if (input.performancePack && (input.loader === 'fabric' || input.loader === 'quilt')) {
    // Runs in the background; progress shows in the downloads panel.
    content.installMany(inst.id, content.PERFORMANCE_PACK, `Performance mods for ${inst.name}`).catch(() => {})
  }
  return inst
}

export function registerIpc(win: BrowserWindow): void {
  const send = (channel: string, payload?: unknown) => !win.isDestroyed() && win.webContents.send(channel, payload)
  instances.onInstancesChanged(() => send('instances:changed'))
  tasks.onTasksChanged((list) => send('tasks:changed', list))

  ipcMain.on('window:minimize', () => win.minimize())
  ipcMain.on('window:close', () => win.close())

  // Settings
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_e, patch: Partial<Settings>) => {
    const clean: Partial<Settings> = {}
    for (const k of SETTINGS_KEYS) if (k in patch) (clean as Record<string, unknown>)[k] = patch[k]
    const next = updateSettings(clean)
    if ('gameDir' in clean) instances.emitInstancesChanged()
    return next
  })
  ipcMain.handle('settings:pickDirectory', async (_e, current?: string) => {
    const r = await dialog.showOpenDialog(win, { defaultPath: current, properties: ['openDirectory', 'createDirectory'] })
    return r.canceled ? null : r.filePaths[0]
  })
  ipcMain.handle('settings:pickFile', async (_e, kind: string, current?: string) => {
    const r = await dialog.showOpenDialog(win, { defaultPath: current, properties: ['openFile'], filters: FILE_FILTERS[kind] ?? [] })
    return r.canceled ? null : r.filePaths[0]
  })

  // System
  ipcMain.handle(
    'system:info',
    (): SystemInfo => ({ platform: process.platform, totalMemMb: Math.floor(totalmem() / 1024 / 1024), appVersion: app.getVersion() })
  )
  ipcMain.handle('system:detectJava', () => detectJava())
  ipcMain.handle('system:openPath', async (_e, p: string) => {
    await shell.openPath(p)
  })
  ipcMain.handle('system:openExternal', async (_e, url: string) => {
    if (/^https:\/\//i.test(url)) await shell.openExternal(url)
  })

  // Versions
  ipcMain.handle('versions:list', () => listVersions())
  ipcMain.handle('versions:loaders', (_e, loader, mc) => loaderVersions(loader, mc))

  // Instances
  ipcMain.handle('instances:list', () => instances.listInstances())
  ipcMain.handle('instances:create', (_e, input: CreateInstanceInput) => createInstance(input))
  ipcMain.handle('instances:update', (_e, id: string, patch) => instances.updateInstance(id, patch))
  ipcMain.handle('instances:setIcon', (_e, id: string, file: string | null) => instances.setInstanceIcon(id, file))
  ipcMain.handle('instances:duplicate', (_e, id: string) => instances.duplicateInstance(id))
  ipcMain.handle('instances:remove', (_e, id: string) => instances.removeInstance(id))
  ipcMain.handle('instances:openFolder', async (_e, id: string, sub?: string) => {
    const dir = instances.instanceDir(id)
    await shell.openPath(sub ? safeJoin(dir, sub) : dir)
  })
  ipcMain.handle('instances:exportMrpack', (_e, id: string) => mrpack.exportMrpack(id))
  ipcMain.handle('instances:importMrpack', (_e, file: string) => mrpack.importMrpack(file))

  // Content
  ipcMain.handle('content:list', (_e, id: string) => content.listContent(id))
  ipcMain.handle('content:checkUpdates', (_e, id: string) => content.checkUpdates(id))
  ipcMain.handle('content:install', (_e, id: string, projectId: string, versionId?: string) => content.installProject(id, projectId, versionId))
  ipcMain.handle('content:addFile', (_e, id: string, file: string, type) => content.addLocalFile(id, file, type))
  ipcMain.handle('content:toggle', (_e, id: string, file: string, type) => content.toggleContent(id, file, type))
  ipcMain.handle('content:remove', (_e, id: string, file: string, type) => content.removeContent(id, file, type))
  ipcMain.handle('content:update', (_e, id: string, list) => content.updateContent(id, list))
  ipcMain.handle('content:installedProjects', (_e, id: string) => content.installedProjectIds(id))

  // Worlds, screenshots, files, logs
  ipcMain.handle('worlds:list', (_e, id: string) => files.listWorlds(id))
  ipcMain.handle('worlds:remove', (_e, id: string, folder: string) => files.removeWorld(id, folder))
  ipcMain.handle('worlds:servers', (_e, id: string) => files.listServers(id))
  ipcMain.handle('worlds:addServer', (_e, id: string, s) => files.addServer(id, s))
  ipcMain.handle('worlds:removeServer', (_e, id: string, i: number) => files.removeServer(id, i))
  ipcMain.handle('screenshots:list', (_e, id: string) => files.listScreenshots(id))
  ipcMain.handle('screenshots:remove', (_e, id: string, f: string) => files.removeScreenshot(id, f))
  ipcMain.handle('files:list', (_e, id: string, dir: string) => files.listFiles(id, dir))
  ipcMain.handle('files:read', (_e, id: string, p: string) => files.readTextFile(id, p))
  ipcMain.handle('files:write', (_e, id: string, p: string, text: string) => files.writeTextFile(id, p, text))
  ipcMain.handle('files:remove', (_e, id: string, p: string) => files.removeFile(id, p))
  ipcMain.handle('files:reveal', (_e, id: string, p: string) => files.revealFile(id, p))
  ipcMain.handle('logs:list', (_e, id: string) => files.listLogs(id))
  ipcMain.handle('logs:read', (_e, id: string, p: string) => files.readLog(id, p))

  // Modrinth
  ipcMain.handle('modrinth:search', (_e, q) => mr.search(q))
  ipcMain.handle('modrinth:project', (_e, id: string) => mr.project(id))
  ipcMain.handle('modrinth:versions', (_e, id: string, filter) => mr.versions(id, filter))
  ipcMain.handle('modrinth:members', (_e, id: string) => mr.members(id))
  ipcMain.handle('modrinth:categories', () => mr.categories())
  ipcMain.handle('modrinth:gameVersions', () => mr.gameVersions())
  ipcMain.handle('modrinth:installModpack', (_e, id: string, versionId?: string) => mrpack.installModpack(id, versionId))

  // Tasks
  ipcMain.handle('tasks:list', () => tasks.listTasks())
  ipcMain.handle('tasks:dismiss', (_e, id: string) => tasks.dismissTask(id))

  // Auth (step 2)
  ipcMain.handle('auth:current', () => auth.currentAccount())
  ipcMain.handle('auth:login', () => auth.login())
  ipcMain.handle('auth:logout', () => auth.logout())

  // Launch
  const running = new Set<string>()
  ipcMain.handle('game:launch', async (_e, id: string) => {
    if (running.has(id)) return
    running.add(id)
    try {
      await launcher.launch(id, (p) => send('game:progress', p))
    } catch (e) {
      send('game:progress', { instanceId: id, stage: 'error', progress: null, message: e instanceof Error ? e.message : String(e) })
    } finally {
      running.delete(id)
    }
  })
}
