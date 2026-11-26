import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, totalmem } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_ACCENT, type Settings } from '@shared/types'

const file = () => join(app.getPath('userData'), 'settings.json')

export function defaultGameDir(): string {
  switch (process.platform) {
    case 'win32':
      return join(app.getPath('appData'), '.pandaclient')
    case 'darwin':
      return join(app.getPath('appData'), 'PandaClient', 'minecraft')
    default:
      return join(homedir(), '.pandaclient')
  }
}

function defaults(): Settings {
  const totalMb = Math.floor(totalmem() / 1024 / 1024)
  // Half the system RAM, between 2 GB and 4 GB, on a 512 MB step.
  const ramMb = Math.max(2048, Math.min(4096, Math.floor(totalMb / 2 / 512) * 512))
  return {
    ramMb,
    javaPath: '',
    jvmArgs: '',
    window: { fullscreen: false, width: 854, height: 480 },
    hooks: { preLaunch: '', wrapper: '', postExit: '' },
    gameDir: defaultGameDir(),
    maxDownloads: 8,
    onLaunch: 'nothing',
    refocusOnExit: true,
    pandaMod: true,
    selectedInstance: '',
    showSnapshots: false,
    theme: 'default',
    accent: DEFAULT_ACCENT,
    uiScale: 100,
    effects: true,
    reduceMotion: false,
    compactLibrary: false,
    showPlayTime: true,
    sidebarRecents: true,
    homeSections: { popularModpacks: true, trendingMods: true, news: true }
  }
}

let cache: Settings | null = null

export function getSettings(): Settings {
  if (cache) return cache
  let stored: Partial<Settings> = {}
  try {
    if (existsSync(file())) stored = JSON.parse(readFileSync(file(), 'utf8'))
  } catch {
    // Corrupt file: fall back to defaults; it gets rewritten on next save.
  }
  const d = defaults()
  cache = {
    ...d,
    ...stored,
    // Nested objects merge so new keys get defaults.
    window: { ...d.window, ...stored.window },
    hooks: { ...d.hooks, ...stored.hooks },
    homeSections: { ...d.homeSections, ...stored.homeSections }
  }
  // v0.2 had a single "close launcher on launch" switch.
  const legacy = stored as { closeOnLaunch?: boolean }
  if (legacy.closeOnLaunch && !stored.onLaunch) cache.onLaunch = 'close'
  return cache
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch }
  next.maxDownloads = Math.max(1, Math.min(32, Math.round(next.maxDownloads)))
  next.uiScale = Math.max(75, Math.min(150, Math.round(next.uiScale)))
  next.window = {
    fullscreen: Boolean(next.window.fullscreen),
    width: Math.max(320, Math.min(7680, Math.round(next.window.width) || 854)),
    height: Math.max(240, Math.min(4320, Math.round(next.window.height) || 480))
  }
  if (!/^#[0-9a-f]{6}$/i.test(next.accent)) next.accent = DEFAULT_ACCENT
  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(file(), JSON.stringify(next, null, 2))
  cache = next
  return next
}
