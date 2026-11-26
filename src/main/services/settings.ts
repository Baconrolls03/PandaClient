import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, totalmem } from 'node:os'
import { join } from 'node:path'
import type { Settings } from '@shared/types'

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
    gameDir: defaultGameDir(),
    closeOnLaunch: false,
    selectedInstance: '',
    showSnapshots: false,
    maxDownloads: 8
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
  cache = { ...defaults(), ...stored }
  return cache
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch }
  next.maxDownloads = Math.max(1, Math.min(32, Math.round(next.maxDownloads)))
  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(file(), JSON.stringify(next, null, 2))
  cache = next
  return next
}
