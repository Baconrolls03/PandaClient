import { app, BrowserWindow, clipboard, ClipboardItem, dialog, ipcMain, shell } from 'electron'
import { totalmem } from 'node:os'
import type { CreateInstanceInput, QuickPlay, Settings, SystemInfo, TransferReport } from '@shared/types'
import { BUNDLES } from '@shared/bundles'
import { transferProfile } from './services/profileTransfer'
import { rm } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getSettings, updateSettings } from './services/settings'
import { listVersions } from './services/versions'
import { fabricVersions, latestStableFabric } from './services/loaders'
import { detectJava } from './services/java'
import * as instances from './services/instances'
import * as content from './services/content'
import * as files from './services/instanceFiles'
import * as mrpack from './services/mrpack'
import * as mr from './services/modrinth'
import * as tasks from './services/tasks'
import * as accounts from './services/accounts'
import { launchGame, onLiveLog, runningInstances, stopGame } from './services/game/launch'
import { findDuplicates, fixDuplicates, modIndex } from './services/crashDoctor'
import { cancelCrashFinder, crashFinderState, onCrashFinder, runCrashFinder } from './services/crashFinder'
import { getStats } from './services/stats'
import { safeJoin } from './services/paths'
import * as panda from './services/pandaApi'
import * as mojangProfile from './services/mojangProfile'
import * as importer from './services/importer'
import * as updater from './services/updater'
import { ensurePandaMod } from './services/pandaMod'
import { pingServer } from './services/serverPing'

const SETTINGS_KEYS: (keyof Settings)[] = [
  'ramMb', 'javaPath', 'jvmArgs', 'window', 'hooks', 'gameDir', 'maxDownloads', 'onLaunch', 'refocusOnExit', 'selectedInstance',
  'showSnapshots', 'theme', 'accent', 'uiScale', 'effects', 'reduceMotion', 'compactLibrary', 'showPlayTime', 'sidebarRecents', 'homeSections'
]

const FILE_FILTERS: Record<string, Electron.FileFilter[]> = {
  java: process.platform === 'win32' ? [{ name: 'Java', extensions: ['exe'] }] : [],
  image: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
  skin: [{ name: 'Minecraft skin', extensions: ['png'] }],
  mrpack: [{ name: 'Modrinth modpack', extensions: ['mrpack'] }],
  content: [{ name: 'Mods & packs', extensions: ['jar', 'zip'] }]
}

async function createInstance(input: CreateInstanceInput, onTransfer: (r: TransferReport) => void = () => {}) {
  const loaderVersion = input.loaderVersion || (await latestStableFabric(input.mcVersion).catch(() => null))
  const inst = await instances.createInstance({ ...input, loaderVersion })
  const ids = input.bundles?.length ? input.bundles : [input.bundle ?? (input.performancePack ? 'performance' : null)]
  const chosen = BUNDLES.filter((b) => ids.includes(b.id))
  const mods = [...new Set(chosen.flatMap((b) => b.mods))]
  // Runs in the background; progress shows in the downloads panel.
  void (async () => {
    if (input.copyFrom) onTransfer(await transferProfile(input.copyFrom, inst.id))
    if (mods.length) await content.installMany(inst.id, mods, `${chosen.map((b) => b.name).join(' + ')} mods for ${inst.name}`)
  })().catch(() => {})
  return inst
}

export function registerIpc(win: BrowserWindow): void {
  const send = (channel: string, payload?: unknown) => !win.isDestroyed() && win.webContents.send(channel, payload)
  instances.onInstancesChanged(() => send('instances:changed'))
  tasks.onTasksChanged((list) => send('tasks:changed', list))
  panda.onOnlineChanged((n) => send('online:changed', n))
  panda.onSharesChanged((s) => send('share:incoming', s))
  panda.onInvitesChanged((i) => send('friends:invites', i))
  panda.onPartyChanged((p) => send('party:changed', p))
  panda.startHeartbeat()
  updater.onUpdateChanged((s) => send('updater:changed', s))
  updater.startUpdater()
  win.on('focus', () => updater.checkSoon())

  ipcMain.on('window:minimize', () => win.minimize())
  ipcMain.on('window:close', () => win.close())
  // Maximise / restore (button and double-click on the top bar); F11 for true full screen.
  ipcMain.on('window:maximize', () => (win.isMaximized() ? win.unmaximize() : win.maximize()))
  ipcMain.on('window:fullscreen', () => win.setFullScreen(!win.isFullScreen()))
  const sendState = () => send('window:state', { maximized: win.isMaximized(), fullscreen: win.isFullScreen() })
  for (const ev of ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen'] as const) win.on(ev as 'maximize', sendState)

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
  ipcMain.handle('system:clearCache', async () => {
    let n = 0
    await rm(join(app.getPath('userData'), 'versions-cache.json'), { force: true })
    for (const inst of await instances.listInstances()) {
      await rm(join(inst.path, '.panda', 'content.json'), { force: true })
      n++
    }
    return `Cleared the version list cache and the Modrinth lookup cache for ${n} instance${n === 1 ? '' : 's'}.`
  })

  // Versions
  ipcMain.handle('versions:list', () => listVersions())
  ipcMain.handle('versions:fabric', (_e, mc: string) => fabricVersions(mc))

  // Instances
  ipcMain.handle('instances:list', () => instances.listInstances())
  ipcMain.handle('instances:create', async (_e, input: CreateInstanceInput) => {
    const inst = await createInstance(input, (r) => send('profiles:transferred', r))
    // The PandaClient mod is part of every supported instance from the start.
    void ensurePandaMod(inst, true, () => {}).catch(() => {})
    return inst
  })
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
  ipcMain.handle('screenshots:copy', async (_e, id: string, f: string) => {
    const inst = await instances.getInstance(id)
    const png = await readFile(safeJoin(join(inst.path, 'screenshots'), String(f)))
    await clipboard.write([new ClipboardItem({ 'image/png': new Blob([new Uint8Array(png)], { type: 'image/png' }) })])
  })
  ipcMain.handle('files:list', (_e, id: string, dir: string) => files.listFiles(id, dir))
  ipcMain.handle('files:read', (_e, id: string, p: string) => files.readTextFile(id, p))
  ipcMain.handle('files:write', (_e, id: string, p: string, text: string) => files.writeTextFile(id, p, text))
  ipcMain.handle('files:remove', (_e, id: string, p: string) => files.removeFile(id, p))
  ipcMain.handle('files:reveal', (_e, id: string, p: string) => files.revealFile(id, p))
  ipcMain.handle('logs:list', (_e, id: string) => files.listLogs(id))
  ipcMain.handle('logs:read', (_e, id: string, p: string) => files.readLog(id, p))
  onLiveLog((instanceId, text) => send('logs:live', { instanceId, text }))

  // Mod doctor: duplicates and the crash finder
  ipcMain.handle('doctor:duplicates', async (_e, id: string) => findDuplicates(await modIndex(await instances.getInstance(id))))
  ipcMain.handle('doctor:fixDuplicates', async (_e, id: string) => fixDuplicates(await instances.getInstance(id)))
  onCrashFinder((s) => send('doctor:crashFinder', s))
  ipcMain.handle('doctor:findCrash', (_e, id: string) => runCrashFinder(id))
  ipcMain.handle('doctor:cancelFindCrash', () => cancelCrashFinder())
  ipcMain.handle('doctor:crashFinderState', () => crashFinderState())
  ipcMain.handle('stats:get', () => getStats())

  // Modrinth
  ipcMain.handle('modrinth:search', (_e, q) => mr.search(q))
  ipcMain.handle('modrinth:project', (_e, id: string) => mr.project(id))
  ipcMain.handle('modrinth:versions', (_e, id: string, filter) => mr.versions(id, filter))
  ipcMain.handle('modrinth:members', (_e, id: string) => mr.members(id))
  ipcMain.handle('modrinth:categories', () => mr.categories())
  ipcMain.handle('modrinth:gameVersions', () => mr.gameVersions())
  ipcMain.handle('modrinth:installModpack', (_e, id: string, versionId?: string) => mrpack.installModpack(id, versionId))

  // Self-update
  ipcMain.handle('updater:state', () => updater.updateState())
  ipcMain.handle('updater:check', () => updater.check())
  ipcMain.handle('updater:install', () => updater.install())

  // Import from other launchers
  ipcMain.handle('importer:scan', () => importer.scanSources())
  ipcMain.handle('importer:describeFolder', (_e, p: string) => importer.describeFolder(p))
  ipcMain.handle('importer:detectVersion', (_e, p: string) => importer.detectVersion(p))
  ipcMain.handle('importer:run', (_e, input) => importer.importSource(input))

  // Wardrobe: PandaClient cosmetics (our server) + real skins/capes (Mojang)
  ipcMain.handle('wardrobe:catalog', () => panda.catalog())
  ipcMain.handle('wardrobe:loadout', () => panda.loadout())
  ipcMain.handle('wardrobe:saveLoadout', (_e, l) => panda.saveLoadout(l))
  ipcMain.handle('wardrobe:profile', () => mojangProfile.profile())
  ipcMain.handle('wardrobe:uploadSkin', (_e, file: string, variant: 'classic' | 'slim') => mojangProfile.uploadSkin(file, variant))
  ipcMain.handle('wardrobe:resetSkin', () => mojangProfile.resetSkin())
  ipcMain.handle('wardrobe:setCape', (_e, id: string | null) => mojangProfile.setCape(id))
  ipcMain.handle('wardrobe:readImage', (_e, file: string) => mojangProfile.readImage(file))
  ipcMain.handle('online:count', () => panda.onlineCount())
  ipcMain.handle('friends:list', () => panda.friends())
  ipcMain.handle('friends:add', (_e, u: string) => panda.addFriend(String(u).slice(0, 16)))
  ipcMain.handle('friends:accept', async (_e, u: string) => void (await panda.acceptFriend(String(u))))
  ipcMain.handle('friends:remove', async (_e, u: string) => void (await panda.removeFriend(String(u))))
  ipcMain.handle('friends:invite', (_e, u: string) => panda.inviteFriend(String(u)))
  ipcMain.handle('friends:myServer', () => panda.myServer())
  ipcMain.handle('friends:invites', () => panda.pendingInvites())
  ipcMain.handle('friends:dismissInvite', (_e, id: string) => panda.dismissInvite(String(id)))
  ipcMain.handle('party:get', () => panda.pollParty())
  ipcMain.handle('party:invite', (_e, u: string) => panda.partyInvite(String(u)))
  ipcMain.handle('party:accept', (_e, id: string) => panda.partyAccept(String(id)))
  ipcMain.handle('party:decline', (_e, id: string) => panda.partyDecline(String(id)))
  ipcMain.handle('party:leave', () => panda.partyLeave())
  ipcMain.handle('party:kick', (_e, u: string) => panda.partyKick(String(u)))
  ipcMain.handle('servers:ping', (_e, a: string) => pingServer(String(a).slice(0, 100)))
  ipcMain.handle('share:players', (_e, q: string) => panda.searchPlayers(String(q).slice(0, 16)))
  ipcMain.handle('share:send', (_e, id: string, to: string[]) => panda.shareInstance(id, Array.isArray(to) ? to.slice(0, 20).map(String) : []))
  ipcMain.handle('share:incoming', () => panda.incomingShares())
  ipcMain.handle('share:accept', (_e, id: string) => panda.acceptShare(String(id)))
  ipcMain.handle('share:dismiss', (_e, id: string) => panda.dismissShare(String(id)))

  // Tasks
  ipcMain.handle('tasks:list', () => tasks.listTasks())
  ipcMain.handle('tasks:dismiss', (_e, id: string) => tasks.dismissTask(id))

  // Microsoft accounts
  ipcMain.handle('auth:list', () => accounts.listAccounts())
  ipcMain.handle('auth:login', () => accounts.login())
  ipcMain.handle('auth:logout', (_e, uuid: string) => accounts.logout(uuid))
  ipcMain.handle('auth:setActive', async (_e, uuid: string) => {
    const list = await accounts.setActive(uuid)
    void panda.refreshOnline()
    return list
  })

  // Launch
  ipcMain.handle('game:launch', async (_e, id: string, quickPlay?: QuickPlay) => {
    try {
      await launchGame(id, (p) => send('game:progress', p), quickPlay)
    } catch (e) {
      send('game:progress', { instanceId: id, stage: 'error', progress: null, message: e instanceof Error ? e.message : String(e) })
    }
  })
  ipcMain.handle('game:stop', (_e, id: string) => stopGame(id))
  ipcMain.handle('game:running', () => runningInstances())
}
