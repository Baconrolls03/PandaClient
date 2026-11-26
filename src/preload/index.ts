import { contextBridge, ipcRenderer } from 'electron'
import type { LaunchProgress, PandaApi, Task } from '@shared/types'

const invoke = ipcRenderer.invoke.bind(ipcRenderer)
function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: unknown, p: T) => cb(p)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: PandaApi = {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close')
  },
  settings: {
    get: () => invoke('settings:get'),
    set: (patch) => invoke('settings:set', patch),
    pickDirectory: (current) => invoke('settings:pickDirectory', current),
    pickFile: (kind, current) => invoke('settings:pickFile', kind, current)
  },
  system: {
    info: () => invoke('system:info'),
    detectJava: () => invoke('system:detectJava'),
    openPath: (p) => invoke('system:openPath', p),
    openExternal: (url) => invoke('system:openExternal', url),
    clearCache: () => invoke('system:clearCache')
  },
  versions: {
    list: () => invoke('versions:list'),
    fabric: (mc) => invoke('versions:fabric', mc)
  },
  instances: {
    list: () => invoke('instances:list'),
    create: (input) => invoke('instances:create', input),
    update: (id, patch) => invoke('instances:update', id, patch),
    setIcon: (id, file) => invoke('instances:setIcon', id, file),
    duplicate: (id) => invoke('instances:duplicate', id),
    remove: (id) => invoke('instances:remove', id),
    openFolder: (id, sub) => invoke('instances:openFolder', id, sub),
    exportMrpack: (id) => invoke('instances:exportMrpack', id),
    importMrpack: (file) => invoke('instances:importMrpack', file),
    onChanged: (cb) => subscribe('instances:changed', cb)
  },
  content: {
    list: (id) => invoke('content:list', id),
    checkUpdates: (id) => invoke('content:checkUpdates', id),
    install: (id, projectId, versionId) => invoke('content:install', id, projectId, versionId),
    addFile: (id, file, type) => invoke('content:addFile', id, file, type),
    toggle: (id, file, type) => invoke('content:toggle', id, file, type),
    remove: (id, file, type) => invoke('content:remove', id, file, type),
    update: (id, files) => invoke('content:update', id, files),
    installedProjects: (id) => invoke('content:installedProjects', id)
  },
  worlds: {
    list: (id) => invoke('worlds:list', id),
    remove: (id, folder) => invoke('worlds:remove', id, folder),
    servers: (id) => invoke('worlds:servers', id),
    addServer: (id, s) => invoke('worlds:addServer', id, s),
    removeServer: (id, i) => invoke('worlds:removeServer', id, i)
  },
  screenshots: {
    list: (id) => invoke('screenshots:list', id),
    remove: (id, f) => invoke('screenshots:remove', id, f)
  },
  files: {
    list: (id, dir) => invoke('files:list', id, dir),
    read: (id, p) => invoke('files:read', id, p),
    write: (id, p, text) => invoke('files:write', id, p, text),
    remove: (id, p) => invoke('files:remove', id, p),
    reveal: (id, p) => invoke('files:reveal', id, p)
  },
  logs: {
    list: (id) => invoke('logs:list', id),
    read: (id, p) => invoke('logs:read', id, p)
  },
  modrinth: {
    search: (q) => invoke('modrinth:search', q),
    project: (id) => invoke('modrinth:project', id),
    versions: (id, filter) => invoke('modrinth:versions', id, filter),
    members: (id) => invoke('modrinth:members', id),
    categories: () => invoke('modrinth:categories'),
    gameVersions: () => invoke('modrinth:gameVersions'),
    installModpack: (id, versionId) => invoke('modrinth:installModpack', id, versionId)
  },
  wardrobe: {
    catalog: () => invoke('wardrobe:catalog'),
    loadout: () => invoke('wardrobe:loadout'),
    saveLoadout: (l) => invoke('wardrobe:saveLoadout', l),
    profile: () => invoke('wardrobe:profile'),
    uploadSkin: (file, variant) => invoke('wardrobe:uploadSkin', file, variant),
    resetSkin: () => invoke('wardrobe:resetSkin'),
    setCape: (id) => invoke('wardrobe:setCape', id),
    readImage: (file) => invoke('wardrobe:readImage', file)
  },
  online: {
    count: () => invoke('online:count'),
    onChanged: (cb) => subscribe<number | null>('online:changed', cb)
  },
  tasks: {
    list: () => invoke('tasks:list'),
    dismiss: (id) => invoke('tasks:dismiss', id),
    onChanged: (cb) => subscribe<Task[]>('tasks:changed', cb)
  },
  auth: {
    list: () => invoke('auth:list'),
    login: () => invoke('auth:login'),
    logout: (uuid) => invoke('auth:logout', uuid),
    setActive: (uuid) => invoke('auth:setActive', uuid)
  },
  game: {
    launch: (id, quickPlay) => invoke('game:launch', id, quickPlay),
    stop: (id) => invoke('game:stop', id),
    running: () => invoke('game:running'),
    onProgress: (cb) => subscribe<LaunchProgress>('game:progress', cb)
  }
}

contextBridge.exposeInMainWorld('panda', api)
