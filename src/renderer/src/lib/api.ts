import type { LaunchProgress, PandaApi, Settings, VersionInfo } from '@shared/types'

/**
 * In Electron this is the preload bridge. In a plain browser (`npm run dev:web`) we fall back
 * to an in-memory mock so the UI can be designed without the main process.
 */
function createMock(): PandaApi {
  let settings: Settings = {
    ramMb: 4096,
    javaPath: '',
    gameDir: 'C:\\Users\\you\\AppData\\Roaming\\.pandaclient',
    closeOnLaunch: false,
    selectedVersion: '',
    showSnapshots: false
  }
  const ids = ['1.21.10', '1.21.8', '1.21.5', '1.21.4', '1.21.1', '1.20.6', '1.20.4', '1.20.1', '1.19.4', '1.19.2', '1.18.2', '1.17.1', '1.16.5', '1.14.4', '1.12.2', '1.8.9']
  const versions: VersionInfo[] = ids.map((id, i) => ({
    id,
    type: 'release',
    releaseTime: new Date(Date.UTC(2025, 9 - i, 1)).toISOString(),
    fabric: !['1.12.2', '1.8.9'].includes(id)
  }))
  versions.splice(1, 0, { id: '25w41a', type: 'snapshot', releaseTime: '2025-10-08T00:00:00Z', fabric: true })
  const listeners = new Set<(p: LaunchProgress) => void>()
  const emit = (p: LaunchProgress) => listeners.forEach((l) => l(p))
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

  return {
    window: { minimize: () => {}, close: () => {} },
    settings: {
      get: async () => settings,
      set: async (patch) => (settings = { ...settings, ...patch }),
      pickDirectory: async () => null,
      pickFile: async () => null
    },
    system: {
      info: async () => ({ platform: 'web', totalMemMb: 16384, appVersion: '0.1.0' }),
      detectJava: async () => [
        { path: 'C:\\Program Files\\Eclipse Adoptium\\jdk-21\\bin\\javaw.exe', version: '21.0.5', major: 21, source: 'system' }
      ],
      openPath: async () => {}
    },
    versions: { list: async () => ({ versions, latestRelease: ids[0], offline: false }) },
    auth: {
      current: async () => null,
      login: async () => {
        throw new Error('Microsoft login arrives in the next build step.')
      },
      logout: async () => {}
    },
    game: {
      launch: async (version) => {
        emit({ stage: 'preparing', progress: null, message: `Preparing Minecraft ${version}…` })
        await wait(700)
        for (let i = 0; i <= 20; i++) {
          emit({ stage: 'downloading', progress: i / 20, message: 'Downloading game files from Mojang (preview)' })
          await wait(90)
        }
        emit({ stage: 'launching', progress: null, message: 'Starting game…' })
        await wait(800)
        emit({ stage: 'idle', progress: null, message: 'Preview finished. Real launching comes in a later step.' })
      },
      onProgress: (cb) => {
        listeners.add(cb)
        return () => listeners.delete(cb)
      }
    }
  }
}

export const api: PandaApi = window.panda ?? createMock()
export const isElectron = Boolean(window.panda)
