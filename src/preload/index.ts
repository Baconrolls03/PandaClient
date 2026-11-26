import { contextBridge, ipcRenderer } from 'electron'
import type { LaunchProgress, PandaApi } from '@shared/types'

const api: PandaApi = {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close')
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch),
    pickDirectory: (current) => ipcRenderer.invoke('settings:pickDirectory', current),
    pickFile: (current) => ipcRenderer.invoke('settings:pickFile', current)
  },
  system: {
    info: () => ipcRenderer.invoke('system:info'),
    detectJava: () => ipcRenderer.invoke('system:detectJava'),
    openPath: (p) => ipcRenderer.invoke('system:openPath', p)
  },
  versions: {
    list: () => ipcRenderer.invoke('versions:list')
  },
  auth: {
    current: () => ipcRenderer.invoke('auth:current'),
    login: () => ipcRenderer.invoke('auth:login'),
    logout: () => ipcRenderer.invoke('auth:logout')
  },
  game: {
    launch: (version) => ipcRenderer.invoke('game:launch', version),
    onProgress: (cb) => {
      const listener = (_e: unknown, p: LaunchProgress) => cb(p)
      ipcRenderer.on('game:progress', listener)
      return () => ipcRenderer.removeListener('game:progress', listener)
    }
  }
}

contextBridge.exposeInMainWorld('panda', api)
