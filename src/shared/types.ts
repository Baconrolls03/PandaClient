// IPC contract shared by main, preload and renderer.

/* ───────────── Settings & system ───────────── */

export type ThemeId = 'default' | 'light' | 'oled' | 'system'

export interface WindowSettings {
  fullscreen: boolean
  width: number
  height: number
}

export interface LaunchHooks {
  /** Runs (and is waited for) before the game starts. */
  preLaunch: string
  /** Wraps the java command, e.g. `gamemoderun` or `prime-run`. */
  wrapper: string
  /** Runs after the game exits. */
  postExit: string
}

export interface Settings {
  /* Instance defaults */
  /** Default max memory for instances, in MB. */
  ramMb: number
  /** Absolute path to a java / javaw executable. Empty = download the right Java from Mojang. */
  javaPath: string
  jvmArgs: string
  window: WindowSettings
  hooks: LaunchHooks

  /* System */
  /** Root folder for Minecraft files and instances. */
  gameDir: string
  maxDownloads: number

  /* Behaviour */
  onLaunch: 'nothing' | 'minimize' | 'close'
  refocusOnExit: boolean
  /** Instance shown in the play bar. */
  selectedInstance: string
  showSnapshots: boolean

  /* Appearance */
  theme: ThemeId
  /** Accent colour (hex). PandaClient mint by default. */
  accent: string
  /** Interface zoom in percent. */
  uiScale: number
  /** Blur and glow effects. */
  effects: boolean
  reduceMotion: boolean
  compactLibrary: boolean
  showPlayTime: boolean
  sidebarRecents: boolean
  homeSections: { popularModpacks: boolean; trendingMods: boolean; news: boolean }
}

export const DEFAULT_ACCENT = '#6EE08F'

export interface SystemInfo {
  platform: 'win32' | 'darwin' | 'linux' | 'web' | (string & {})
  totalMemMb: number
  appVersion: string
}

export interface JavaInstall {
  path: string
  version: string
  major: number
  source: 'JAVA_HOME' | 'PATH' | 'system' | 'minecraft-runtime'
}

export interface Account {
  uuid: string
  username: string
  active: boolean
}

/* ───────────── Versions & loaders ───────────── */

/** PandaClient is a Fabric-only launcher. Kept as a field so instance.json stays forward compatible. */
export type Loader = 'fabric'

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
  /** True if served from cache because the network was unavailable. */
  offline: boolean
}

export interface LoaderVersion {
  version: string
  stable: boolean
}

/* ───────────── Instances ───────────── */

export interface Instance {
  id: string
  name: string
  mcVersion: string
  loader: Loader
  loaderVersion: string | null
  created: string
  lastPlayed: string | null
  /** panda:// URL of an uploaded icon, filled in by the main process. */
  iconUrl: string | null
  /** Built-in icon (background + symbol), used when there's no uploaded icon. */
  iconPreset: IconPreset | null
  /** Per-instance overrides; null = use global setting. */
  ramMb: number | null
  javaPath: string | null
  jvmArgs: string
  window: WindowSettings | null
  hooks: LaunchHooks | null
  /** Total seconds played. */
  playtimeSec: number
  /** Set when the instance came from a Modrinth modpack. */
  modpack: { projectId: string; versionId: string; title: string } | null
  /** Folder on disk. */
  path: string
}

export interface IconPreset {
  /** Background id from ICON_BACKGROUNDS. */
  bg: string
  /** Symbol id from the renderer's icon set. */
  symbol: string
}

export interface CreateInstanceInput {
  name: string
  iconPreset?: IconPreset | null
  mcVersion: string
  /** Fabric loader version; null = latest stable. */
  loaderVersion: string | null
  /** Install Fabric API, Sodium, Lithium, Iris. */
  performancePack: boolean
  /** Local image file to use as the icon. */
  iconFile?: string | null
}

export type ContentType = 'mod' | 'resourcepack' | 'shader' | 'datapack'

export const CONTENT_FOLDERS: Record<ContentType, string> = {
  mod: 'mods',
  resourcepack: 'resourcepacks',
  shader: 'shaderpacks',
  datapack: 'datapacks'
}

export interface ContentItem {
  /** File name on disk, including `.disabled` when disabled. */
  file: string
  type: ContentType
  enabled: boolean
  size: number
  sha1: string
  project: { id: string; slug: string; title: string; iconUrl: string | null } | null
  version: { id: string; number: string } | null
  update: { versionId: string; number: string } | null
}

export interface WorldInfo {
  folder: string
  name: string
  lastPlayed: number | null
  gameMode: string | null
  iconUrl: string | null
}

export interface ServerEntry {
  name: string
  ip: string
  iconUrl: string | null
}

export interface Screenshot {
  file: string
  url: string
  mtime: number
}

export interface FileEntry {
  name: string
  /** Path relative to the instance folder, `/` separated. */
  path: string
  dir: boolean
  size: number
  mtime: number
}

export interface LogFile {
  name: string
  /** Relative to the instance folder. */
  path: string
  kind: 'log' | 'crash'
  mtime: number
  size: number
}

/* ───────────── Tasks / progress ───────────── */

export interface Task {
  id: string
  title: string
  detail: string
  /** 0–1, or null when indeterminate. */
  progress: number | null
  status: 'running' | 'done' | 'error'
  error?: string
  instanceId?: string
}

export type LaunchStage = 'idle' | 'preparing' | 'downloading' | 'installing-mods' | 'launching' | 'running' | 'error'

export interface LaunchProgress {
  stage: LaunchStage
  progress: number | null
  message: string
  instanceId?: string
}

export interface QuickPlay {
  world?: string
  server?: string
}

/* ───────────── Modrinth ───────────── */

export type ProjectType = 'mod' | 'modpack' | 'resourcepack' | 'shader' | 'datapack'
export type SortIndex = 'relevance' | 'downloads' | 'follows' | 'newest' | 'updated'

export interface SearchQuery {
  query: string
  type: ProjectType
  sort: SortIndex
  categories: string[]
  loaders: string[]
  gameVersions: string[]
  environment: 'client' | 'server' | null
  offset: number
  limit: number
}

export interface MrSearchHit {
  project_id: string
  project_type: string
  slug: string
  author: string
  title: string
  description: string
  categories: string[]
  display_categories?: string[]
  versions: string[]
  downloads: number
  follows: number
  icon_url: string | null
  date_created: string
  date_modified: string
  latest_version?: string
  client_side?: string
  server_side?: string
  featured_gallery?: string | null
  gallery?: string[]
  color?: number | null
}

export interface MrSearchResult {
  hits: MrSearchHit[]
  offset: number
  limit: number
  total_hits: number
}

export interface MrGalleryImage {
  url: string
  featured: boolean
  title: string | null
  description: string | null
  ordering: number
}

export interface MrProject {
  id: string
  slug: string
  project_type: string
  team: string
  title: string
  description: string
  body: string
  categories: string[]
  additional_categories?: string[]
  client_side: string
  server_side: string
  downloads: number
  followers: number
  icon_url: string | null
  gallery: MrGalleryImage[]
  versions: string[]
  game_versions: string[]
  loaders: string[]
  issues_url: string | null
  source_url: string | null
  wiki_url: string | null
  discord_url: string | null
  donation_urls?: { id: string; platform: string; url: string }[]
  license?: { id: string; name: string; url: string | null }
  published: string
  updated: string
  color?: number | null
}

export interface MrFile {
  hashes: { sha1: string; sha512: string }
  url: string
  filename: string
  primary: boolean
  size: number
  file_type?: string | null
}

export interface MrDependency {
  version_id: string | null
  project_id: string | null
  file_name: string | null
  dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded'
}

export interface MrVersion {
  id: string
  project_id: string
  name: string
  version_number: string
  changelog: string | null
  dependencies: MrDependency[]
  game_versions: string[]
  version_type: 'release' | 'beta' | 'alpha'
  loaders: string[]
  featured: boolean
  date_published: string
  downloads: number
  files: MrFile[]
}

export interface MrTeamMember {
  role: string
  user: { username: string; avatar_url: string | null }
}

export interface MrCategory {
  /** SVG markup (may be empty). */
  icon?: string
  name: string
  project_type: string
  header: string
}

export interface MrGameVersion {
  version: string
  version_type: string
  date: string
  major: boolean
}

/* ───────────── API exposed on window.panda ───────────── */

export interface PandaApi {
  window: {
    minimize(): void
    close(): void
  }
  settings: {
    get(): Promise<Settings>
    set(patch: Partial<Settings>): Promise<Settings>
    pickDirectory(current?: string): Promise<string | null>
    pickFile(kind: 'java' | 'image' | 'mrpack' | 'content', current?: string): Promise<string | null>
  }
  system: {
    info(): Promise<SystemInfo>
    detectJava(): Promise<JavaInstall[]>
    openPath(path: string): Promise<void>
    openExternal(url: string): Promise<void>
    /** Delete cached downloads that can be fetched again (version JSON cache, Modrinth lookup cache). Returns a summary. */
    clearCache(): Promise<string>
  }
  versions: {
    list(): Promise<VersionList>
    fabric(mcVersion: string): Promise<LoaderVersion[]>
  }
  instances: {
    list(): Promise<Instance[]>
    create(input: CreateInstanceInput): Promise<Instance>
    update(id: string, patch: Partial<Pick<Instance, 'name' | 'ramMb' | 'javaPath' | 'jvmArgs' | 'window' | 'hooks' | 'iconPreset'>>): Promise<Instance>
    setIcon(id: string, file: string | null): Promise<Instance>
    duplicate(id: string): Promise<Instance>
    remove(id: string): Promise<void>
    openFolder(id: string, sub?: string): Promise<void>
    exportMrpack(id: string): Promise<string | null>
    importMrpack(file: string): Promise<Instance>
    onChanged(cb: () => void): () => void
  }
  content: {
    list(id: string): Promise<ContentItem[]>
    checkUpdates(id: string): Promise<ContentItem[]>
    install(id: string, projectId: string, versionId?: string): Promise<void>
    addFile(id: string, file: string, type: ContentType): Promise<void>
    toggle(id: string, file: string, type: ContentType): Promise<void>
    remove(id: string, file: string, type: ContentType): Promise<void>
    update(id: string, files: { file: string; type: ContentType }[]): Promise<void>
    installedProjects(id: string): Promise<string[]>
  }
  worlds: {
    list(id: string): Promise<WorldInfo[]>
    remove(id: string, folder: string): Promise<void>
    servers(id: string): Promise<ServerEntry[]>
    addServer(id: string, server: { name: string; ip: string }): Promise<ServerEntry[]>
    removeServer(id: string, index: number): Promise<ServerEntry[]>
  }
  screenshots: {
    list(id: string): Promise<Screenshot[]>
    remove(id: string, file: string): Promise<void>
  }
  files: {
    list(id: string, dir: string): Promise<FileEntry[]>
    read(id: string, path: string): Promise<string>
    write(id: string, path: string, text: string): Promise<void>
    remove(id: string, path: string): Promise<void>
    reveal(id: string, path: string): Promise<void>
  }
  logs: {
    list(id: string): Promise<LogFile[]>
    read(id: string, path: string): Promise<string>
  }
  modrinth: {
    search(q: SearchQuery): Promise<MrSearchResult>
    project(idOrSlug: string): Promise<MrProject>
    versions(idOrSlug: string, filter?: { loaders?: string[]; gameVersions?: string[] }): Promise<MrVersion[]>
    members(idOrSlug: string): Promise<MrTeamMember[]>
    categories(): Promise<MrCategory[]>
    gameVersions(): Promise<MrGameVersion[]>
    installModpack(projectId: string, versionId?: string): Promise<Instance>
  }
  tasks: {
    list(): Promise<Task[]>
    dismiss(id: string): Promise<void>
    onChanged(cb: (tasks: Task[]) => void): () => void
  }
  auth: {
    list(): Promise<Account[]>
    login(): Promise<Account>
    logout(uuid: string): Promise<Account[]>
    setActive(uuid: string): Promise<Account[]>
  }
  game: {
    launch(instanceId: string, quickPlay?: QuickPlay): Promise<void>
    stop(instanceId: string): Promise<void>
    running(): Promise<string[]>
    onProgress(cb: (p: LaunchProgress) => void): () => void
  }
}
