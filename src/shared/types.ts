// IPC contract shared by main, preload and renderer.

export interface Settings {
  /** Max memory for the game, in MB. */
  ramMb: number
  /** Absolute path to a java / javaw executable. Empty = auto. */
  javaPath: string
  /** Root folder for Minecraft files. */
  gameDir: string
  closeOnLaunch: boolean
  /** Last version the user picked on the Home screen. */
  selectedVersion: string
  showSnapshots: boolean
}

export interface VersionInfo {
  id: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
  releaseTime: string
  /** Fabric Meta lists this game version. */
  fabric: boolean
}

export interface VersionList {
  versions: VersionInfo[]
  latestRelease: string
  /** True if served from the bundled fallback because the network was unavailable. */
  offline: boolean
}

export interface JavaInstall {
  path: string
  version: string
  major: number
  source: 'JAVA_HOME' | 'PATH' | 'system' | 'minecraft-runtime'
}

export interface SystemInfo {
  platform: 'win32' | 'darwin' | 'linux' | 'web' | (string & {})
  totalMemMb: number
  appVersion: string
}

export interface Account {
  uuid: string
  username: string
}

export type LaunchStage = 'idle' | 'preparing' | 'downloading' | 'installing-mods' | 'launching' | 'running' | 'error'

export interface LaunchProgress {
  stage: LaunchStage
  /** 0–1, or null when indeterminate. */
  progress: number | null
  message: string
}

export interface PandaApi {
  window: {
    minimize(): void
    close(): void
  }
  settings: {
    get(): Promise<Settings>
    set(patch: Partial<Settings>): Promise<Settings>
    pickDirectory(current?: string): Promise<string | null>
    pickFile(current?: string): Promise<string | null>
  }
  system: {
    info(): Promise<SystemInfo>
    detectJava(): Promise<JavaInstall[]>
    openPath(path: string): Promise<void>
  }
  versions: {
    list(): Promise<VersionList>
  }
  auth: {
    current(): Promise<Account | null>
    login(): Promise<Account>
    logout(): Promise<void>
  }
  game: {
    launch(version: string): Promise<void>
    onProgress(cb: (p: LaunchProgress) => void): () => void
  }
}
