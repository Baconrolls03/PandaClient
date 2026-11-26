// In-browser stand-in for the Electron bridge (`npm run dev:web`). Sample data only.
import { live, webModrinth } from './webModrinth'
import seedCosmetics from '../../../../supabase/seed/cosmetics.json'
import type {
  Account,
  ContentItem,
  Cosmetic,
  Loadout,
  Instance,
  LaunchProgress,
  MrProject,
  MrSearchHit,
  MrVersion,
  PandaApi,
  ProjectType,
  Settings,
  Task,
  VersionInfo
} from '@shared/types'

const PANDA_API = 'https://yljkeadmxsmwiclrbvgp.supabase.co/functions/v1/api'
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function icon(letter: string, hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 58%)"/><stop offset="1" stop-color="hsl(${hue + 30} 70% 42%)"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#g)"/><text x="32" y="42" font-family="Inter,sans-serif" font-size="28" font-weight="700" fill="white" text-anchor="middle">${letter}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function shot(hue: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 60% 70%)"/><stop offset="0.6" stop-color="hsl(${hue + 20} 40% 45%)"/><stop offset="1" stop-color="hsl(${hue + 40} 35% 22%)"/></linearGradient></defs><rect width="320" height="180" fill="url(#s)"/><path d="M0 130 L60 100 L110 120 L170 80 L230 115 L320 90 L320 180 L0 180Z" fill="hsl(${hue + 60} 30% 25%)"/><text x="12" y="168" font-family="sans-serif" font-size="11" fill="white" opacity=".8">${label}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const SAMPLE: [ProjectType, string, string, string, string[], number, number][] = [
  ['mod', 'sodium', 'Sodium', 'The fastest rendering optimization mod for Minecraft.', ['optimization', 'fabric', 'neoforge', 'quilt'], 72_400_000, 24_100],
  ['mod', 'fabric-api', 'Fabric API', 'Lightweight and modular API providing common hooks and interoperability.', ['library', 'fabric'], 98_200_000, 21_900],
  ['mod', 'iris', 'Iris Shaders', 'A modern shader pack loader for Minecraft, compatible with OptiFine shaders.', ['decoration', 'optimization', 'fabric', 'neoforge'], 58_700_000, 19_300],
  ['mod', 'lithium', 'Lithium', 'No-compromises game logic optimization mod.', ['optimization', 'fabric', 'neoforge'], 41_300_000, 11_800],
  ['mod', 'modmenu', 'Mod Menu', 'Adds a mod menu to view the list of mods you have installed.', ['utility', 'fabric', 'quilt'], 64_100_000, 13_200],
  ['mod', 'entityculling', 'Entity Culling', 'Skip rendering entities that are not visible.', ['optimization', 'fabric', 'forge', 'neoforge'], 39_800_000, 8_200],
  ['mod', 'xaeros-minimap', "Xaero's Minimap", 'Displays a minimap, waypoints and entities around you.', ['adventure', 'utility', 'fabric', 'forge'], 33_500_000, 9_800],
  ['mod', 'appleskin', 'AppleSkin', 'Adds food value information to tooltips and the HUD.', ['food', 'utility', 'fabric', 'forge', 'neoforge'], 30_200_000, 7_100],
  ['mod', 'jei', 'Just Enough Items', 'Item and recipe viewing mod.', ['utility', 'forge', 'neoforge', 'fabric'], 28_900_000, 6_400],
  ['mod', 'zoomify', 'Zoomify', 'A zoom mod with infinite customizability.', ['utility', 'fabric', 'neoforge'], 18_400_000, 5_100],
  ['mod', 'continuity', 'Continuity', 'Connected textures with full OptiFine format support.', ['decoration', 'fabric', 'quilt'], 16_300_000, 4_900],
  ['mod', 'ferrite-core', 'FerriteCore', 'Memory usage optimizations.', ['optimization', 'fabric', 'forge', 'neoforge'], 45_800_000, 6_700],
  ['modpack', 'fabulously-optimized', 'Fabulously Optimized', 'Improve your graphics and performance with this simple modpack.', ['optimization', 'lightweight', 'fabric'], 9_800_000, 7_400],
  ['modpack', 'cobblemon-fabric', 'Cobblemon Official Modpack', 'Pokémon-inspired adventure with the Cobblemon mod.', ['adventure', 'multiplayer', 'fabric'], 4_100_000, 3_100],
  ['modpack', 'simply-optimized', 'Simply Optimized', 'The leading modpack for optimization, without changing gameplay.', ['optimization', 'lightweight', 'fabric'], 3_600_000, 2_800],
  ['modpack', 'better-mc', 'Better MC', 'The best of vanilla, with 200+ mods.', ['adventure', 'challenging', 'forge'], 2_900_000, 2_400],
  ['modpack', 'adrenaserver', 'Additive', 'A vanilla-plus modpack with quality-of-life additions.', ['quests', 'lightweight', 'fabric'], 1_200_000, 1_100],
  ['resourcepack', 'faithful-32x', 'Faithful 32x', 'The classic Minecraft look, in double the resolution.', ['32x', 'simplistic'], 6_700_000, 3_900],
  ['resourcepack', 'fresh-animations', 'Fresh Animations', 'Adds new life to Minecraft mobs with smooth animations.', ['entities', 'tweaks'], 5_300_000, 4_200],
  ['resourcepack', 'stay-true', 'Stay True', 'A vanilla-style texture pack with improved variety.', ['16x', 'blocks'], 2_100_000, 1_700],
  ['shader', 'complementary-reimagined', 'Complementary Reimagined', 'Beautiful, performant shaders that stay true to Minecraft.', ['iris', 'optifine', 'medium'], 14_200_000, 6_800],
  ['shader', 'bsl-shaders', 'BSL Shaders', 'Bright and smooth lighting shaders.', ['iris', 'optifine', 'high'], 11_900_000, 4_100],
  ['shader', 'makeup-ultra-fast', 'MakeUp - Ultra Fast', 'Shaders designed for low-end hardware.', ['iris', 'optifine', 'potato'], 4_800_000, 2_000],
  ['datapack', 'terralith', 'Terralith', 'Explore almost 100 new biomes consisting of both realism and light fantasy.', ['worldgen', 'datapack'], 8_700_000, 5_600],
  ['datapack', 'incendium', 'Incendium', 'Completely revamps the Nether.', ['worldgen', 'datapack'], 3_100_000, 2_500]
]

const HITS: MrSearchHit[] = SAMPLE.map(([type, slug, title, desc, cats, downloads, follows], i) => ({
  project_id: `P${i}`,
  project_type: type,
  slug,
  author: ['jellysquid3', 'modmuss50', 'coderbot', 'Prospector', 'IMS', 'tr7zw', 'xaero96'][i % 7],
  title,
  description: desc,
  categories: cats,
  display_categories: cats,
  versions: ['1.20.1', '1.21.1', '1.21.11', '26.1', '26.2', '26.3'],
  downloads,
  follows,
  icon_url: icon(title[0], (i * 47) % 360),
  date_created: '2023-01-10T00:00:00Z',
  date_modified: new Date(Date.now() - i * 86400000 * 3).toISOString(),
  latest_version: '26.3',
  client_side: 'required',
  server_side: type === 'shader' || type === 'resourcepack' ? 'unsupported' : 'optional',
  featured_gallery: shot((i * 47) % 360, title),
  gallery: [shot((i * 47) % 360, title)]
}))

const CATEGORIES = [
  ...['adventure', 'decoration', 'food', 'library', 'magic', 'optimization', 'storage', 'technology', 'utility', 'worldgen'].map((name) => ({ name, project_type: 'mod', header: 'categories' })),
  ...['adventure', 'challenging', 'lightweight', 'multiplayer', 'optimization', 'quests', 'technology'].map((name) => ({ name, project_type: 'modpack', header: 'categories' })),
  ...['blocks', 'entities', 'simplistic', 'tweaks', 'realistic'].map((name) => ({ name, project_type: 'resourcepack', header: 'categories' })),
  ...['16x', '32x', '64x'].map((name) => ({ name, project_type: 'resourcepack', header: 'resolutions' })),
  ...['cartoon', 'fantasy', 'realistic', 'semi-realistic'].map((name) => ({ name, project_type: 'shader', header: 'categories' })),
  ...['potato', 'low', 'medium', 'high'].map((name) => ({ name, project_type: 'shader', header: 'performance impact' })),
  ...['worldgen', 'adventure', 'utility'].map((name) => ({ name, project_type: 'datapack', header: 'categories' }))
]

const MC = ['26.3', '26.2', '26.1.2', '26.1', '1.21.11', '1.21.10', '1.21.8', '1.21.4', '1.21.1', '1.20.6', '1.20.4', '1.20.1', '1.19.4', '1.19.2', '1.18.2', '1.17.1', '1.16.5', '1.14.4']

const BODY = (title: string) => `## About ${title}

${title} is one of the most popular projects on Modrinth. This is **sample text** shown in the browser preview; the real app loads the full description from Modrinth.

### Features
- Works out of the box with no configuration
- Compatible with most other mods
- Regularly updated for new Minecraft versions

> Tip: install it into an instance from the **Install** button, and PandaClient pulls in any required dependencies for you.

| Setting | Default |
|---|---|
| Enabled | \`true\` |
| Quality | \`high\` |

[Visit the wiki](https://modrinth.com)
`

function toProject(h: MrSearchHit): MrProject {
  return {
    id: h.project_id,
    slug: h.slug,
    project_type: h.project_type,
    team: 'team',
    title: h.title,
    description: h.description,
    body: BODY(h.title),
    categories: h.categories,
    client_side: h.client_side ?? 'required',
    server_side: h.server_side ?? 'optional',
    downloads: h.downloads,
    followers: h.follows,
    icon_url: h.icon_url,
    gallery: [0, 1, 2, 3].map((n) => ({ url: shot((n * 70 + h.title.length * 9) % 360, `${h.title} screenshot ${n + 1}`), featured: n === 0, title: `Screenshot ${n + 1}`, description: null, ordering: n })),
    versions: [],
    game_versions: h.versions,
    loaders: h.categories.filter((c) => ['fabric', 'forge', 'neoforge', 'quilt', 'iris', 'optifine', 'datapack'].includes(c)),
    issues_url: 'https://github.com',
    source_url: 'https://github.com',
    wiki_url: null,
    discord_url: 'https://discord.com',
    donation_urls: [{ id: 'ko-fi', platform: 'Ko-fi', url: 'https://ko-fi.com' }],
    license: { id: 'LGPL-3.0-only', name: 'GNU LGPLv3', url: null },
    published: h.date_created,
    updated: h.date_modified
  }
}

function versionsFor(h: MrSearchHit): MrVersion[] {
  const loaders = h.categories.filter((c) => ['fabric', 'forge', 'neoforge', 'quilt'].includes(c))
  return ['26.3', '26.2', '1.21.11', '1.21.1', '1.20.4', '1.20.1'].map((gv, i) => ({
    id: `${h.project_id}-v${i}`,
    project_id: h.project_id,
    name: `${h.title} ${3 - i * 0.1 > 0 ? (3 - i * 0.1).toFixed(1) : '0.1'} for ${gv}`,
    version_number: `${(3 - i * 0.1).toFixed(1)}.0+${gv}`,
    changelog: `- Updated to Minecraft ${gv}\n- Fixed a crash when opening the world list\n- Improved performance`,
    dependencies: [],
    game_versions: [gv],
    version_type: i === 1 ? 'beta' : 'release',
    loaders: loaders.length ? loaders : h.project_type === 'shader' ? ['iris', 'optifine'] : ['minecraft'],
    featured: i === 0,
    date_published: new Date(Date.now() - i * 86400000 * 20).toISOString(),
    downloads: Math.round(h.downloads / (i + 3)),
    files: [{ hashes: { sha1: '', sha512: '' }, url: '', filename: `${h.slug}-${gv}.jar`, primary: true, size: 1_200_000 }]
  }))
}

export function createMock(): PandaApi {
  let settings: Settings = {
    ramMb: 4096,
    javaPath: '',
    gameDir: 'C:\\Users\\you\\AppData\\Roaming\\.pandaclient',
    jvmArgs: '',
    window: { fullscreen: false, width: 854, height: 480 },
    hooks: { preLaunch: '', wrapper: '', postExit: '' },
    onLaunch: 'nothing',
    refocusOnExit: true,
    selectedInstance: '',
    showSnapshots: false,
    maxDownloads: 8,
    theme: 'default',
    accent: '#6EE08F',
    uiScale: 100,
    effects: true,
    reduceMotion: false,
    compactLibrary: false,
    showPlayTime: true,
    sidebarRecents: true,
    homeSections: { popularModpacks: true, trendingMods: true, news: true }
  }
  const now = Date.now()
  const mkInst = (id: string, name: string, mc: string, lv: string | null, hue: number | null, played: number | null, modpack: Instance['modpack'] = null): Instance => ({
    id,
    name,
    mcVersion: mc,
    loader: 'fabric',
    loaderVersion: lv,
    created: new Date(now - 30 * 86400000).toISOString(),
    lastPlayed: played == null ? null : new Date(now - played).toISOString(),
    iconUrl: null,
    iconPreset: hue == null ? null : { bg: ['mint', 'sky', 'sunset', 'grape', 'rose'][Math.round(hue / 75) % 5], symbol: ['pickaxe', 'gem', 'sword', 'castle', 'flame'][Math.round(hue / 75) % 5] },
    ramMb: null,
    javaPath: null,
    jvmArgs: '',
    window: null,
    hooks: null,
    playtimeSec: played == null ? 0 : 3 * 3600 + 1200,
    modpack,
    path: `${settings.gameDir}\\instances\\${id}`
  })
  let instances: Instance[] = [
    mkInst('pandaclient', 'PandaClient', '26.3', '0.20.1', null, 3600_000),
    mkInst('fabulously-optimized', 'Fabulously Optimized', '26.2', '0.20.1', 200, 2 * 86400000, { projectId: 'P12', versionId: 'x', title: 'Fabulously Optimized' }),
    mkInst('cobblemon', 'Cobblemon', '1.21.1', '0.17.2', 25, 6 * 86400000),
    mkInst('pvp', 'PvP 1.21.11', '1.21.11', '0.20.1', 0, null)
  ]
  const contentFor = (inst: Instance): ContentItem[] => {
    const picks = inst.id === 'pvp' ? [1, 0, 9] : [1, 0, 2, 3, 4, 5, 9, 10, 11]
    const items: ContentItem[] = picks.map((p, i) => {
      const h = HITS[p]
      return {
        file: `${h.slug}-1.0.jar${i === 5 ? '.disabled' : ''}`,
        type: 'mod',
        enabled: i !== 5,
        size: 400_000 + i * 120_000,
        sha1: `sha${p}`,
        project: { id: h.project_id, slug: h.slug, title: h.title, iconUrl: h.icon_url },
        version: { id: `${h.project_id}-v1`, number: '3.0.0' },
        update: null
      }
    })
    items.push({ file: 'my-local-mod.jar', type: 'mod', enabled: true, size: 82_000, sha1: 'local', project: null, version: null, update: null })
    items.push({ file: 'faithful-32x.zip', type: 'resourcepack', enabled: true, size: 9_800_000, sha1: 'rp', project: { id: 'P17', slug: 'faithful-32x', title: 'Faithful 32x', iconUrl: HITS[17].icon_url }, version: { id: 'x', number: '1.21' }, update: null })
    items.push({ file: 'ComplementaryReimagined.zip', type: 'shader', enabled: true, size: 1_400_000, sha1: 'sh', project: { id: 'P20', slug: 'complementary-reimagined', title: 'Complementary Reimagined', iconUrl: HITS[20].icon_url }, version: { id: 'x', number: 'r5.4' }, update: null })
    return items
  }
  const content = new Map(instances.map((i) => [i.id, contentFor(i)]))

  const instListeners = new Set<() => void>()
  const changed = () => instListeners.forEach((l) => l())
  let tasks: Task[] = []
  const taskListeners = new Set<(t: Task[]) => void>()
  const emitTasks = () => taskListeners.forEach((l) => l([...tasks]))
  async function fakeTask(title: string, steps = 12) {
    const id = String(Math.random())
    tasks = [{ id, title, detail: 'Starting…', progress: 0, status: 'running' }, ...tasks]
    emitTasks()
    for (let i = 1; i <= steps; i++) {
      await wait(120)
      tasks = tasks.map((t) => (t.id === id ? { ...t, progress: i / steps, detail: `Downloading files (${i}/${steps})` } : t))
      emitTasks()
    }
    tasks = tasks.map((t) => (t.id === id ? { ...t, status: 'done', detail: 'Done', progress: 1 } : t))
    emitTasks()
  }

  let accounts: Account[] = []
  let loadout: Loadout = { cape: 'panda-classic', hat: 'beanie' }
  const progressListeners = new Set<(p: LaunchProgress) => void>()
  const emit = (p: LaunchProgress) => progressListeners.forEach((l) => l(p))
  const find = (id: string) => instances.find((i) => i.id === id)!
  const hitBy = (id: string) => HITS.find((h) => h.project_id === id || h.slug === id)!

  const versionList: VersionInfo[] = MC.map((id, i) => ({ id, type: 'release', releaseTime: new Date(Date.UTC(2026, 9 - i, 1)).toISOString(), fabric: true }))
  versionList.push({ id: '1.12.2', type: 'release', releaseTime: '2017-09-18T00:00:00Z', fabric: false }, { id: '1.8.9', type: 'release', releaseTime: '2015-12-09T00:00:00Z', fabric: false })
  versionList.unshift({ id: '26.4-pre-1', type: 'snapshot', releaseTime: '2026-11-20T00:00:00Z', fabric: true })

  return {
    window: { minimize: () => {}, close: () => {} },
    settings: {
      get: async () => settings,
      set: async (patch) => (settings = { ...settings, ...patch }),
      pickDirectory: async () => null,
      pickFile: async () => null
    },
    system: {
      info: async () => ({ platform: 'web', totalMemMb: 16384, appVersion: '0.2.0' }),
      detectJava: async () => [
        { path: 'C:\\Program Files\\Eclipse Adoptium\\jdk-21\\bin\\javaw.exe', version: '21.0.5', major: 21, source: 'system' },
        { path: 'C:\\Program Files\\Java\\jre1.8.0_421\\bin\\javaw.exe', version: '1.8.0_421', major: 8, source: 'system' }
      ],
      openPath: async () => {},
      openExternal: async (url) => void window.open(url, '_blank'),
      clearCache: async () => 'Cleared the version list cache and the Modrinth lookup cache (preview).'
    },
    versions: {
      list: async () => ({ versions: versionList, latestRelease: MC[0], offline: false }),
      fabric: async () => [{ version: '0.20.1', stable: true }, { version: '0.20.0', stable: true }, { version: '0.19.2', stable: true }]
    },
    instances: {
      list: async () => [...instances].sort((a, b) => (b.lastPlayed ?? b.created).localeCompare(a.lastPlayed ?? a.created)),
      create: async (input) => {
        const id = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'instance'
        const inst = mkInst(id, input.name || 'New instance', input.mcVersion, input.loaderVersion ?? '0.20.1', null, null)
        instances = [...instances, inst]
        content.set(id, [])
        changed()
        if (input.performancePack) fakeTask(`Performance mods for ${inst.name}`, 8)
        return inst
      },
      update: async (id, patch) => {
        instances = instances.map((i) => (i.id === id ? { ...i, ...patch } : i))
        changed()
        return find(id)
      },
      setIcon: async (id) => find(id),
      duplicate: async (id) => {
        const copy = { ...find(id), id: `${id}-copy`, name: `${find(id).name} (copy)` }
        instances = [...instances, copy]
        content.set(copy.id, [...(content.get(id) ?? [])])
        changed()
        return copy
      },
      remove: async (id) => {
        instances = instances.filter((i) => i.id !== id)
        changed()
      },
      openFolder: async () => {},
      exportMrpack: async () => {
        await fakeTask('Exporting modpack', 5)
        return 'C:\\Users\\you\\Desktop\\export.mrpack'
      },
      importMrpack: async () => find('pandaclient'),
      onChanged: (cb) => (instListeners.add(cb), () => instListeners.delete(cb))
    },
    content: {
      list: async (id) => {
        const items = content.get(id) ?? []
        // Swap the sample icons for the real ones from Modrinth when online.
        const slugs = items.map((i) => i.project?.slug).filter(Boolean) as string[]
        const real = await live(() => webModrinth.projects(slugs), async () => [])
        const bySlug = new Map(real.map((p) => [p.slug, p]))
        return items.map((i) => {
          const p = i.project && bySlug.get(i.project.slug)
          return p && i.project ? { ...i, project: { ...i.project, id: p.id, title: p.title, iconUrl: p.icon_url } } : i
        })
      },
      checkUpdates: async (id) => {
        await wait(600)
        const list = (content.get(id) ?? []).map((c, i) => (c.project && i % 3 === 0 ? { ...c, update: { versionId: 'new', number: '3.1.0' } } : c))
        content.set(id, list)
        return list
      },
      install: async (id, projectId) => {
        const p = await live(() => webModrinth.project(projectId), async () => toProject(hitBy(projectId)))
        const h = { slug: p.slug, title: p.title, project_id: p.id, icon_url: p.icon_url, project_type: p.project_type }
        await fakeTask(`Installing ${h.title}`, 6)
        const type = h.project_type === 'resourcepack' ? 'resourcepack' : h.project_type === 'shader' ? 'shader' : h.project_type === 'datapack' ? 'datapack' : 'mod'
        content.set(id, [...(content.get(id) ?? []), { file: `${h.slug}.jar`, type, enabled: true, size: 500_000, sha1: h.slug, project: { id: h.project_id, slug: h.slug, title: h.title, iconUrl: h.icon_url }, version: { id: 'v', number: '3.0.0' }, update: null }])
      },
      addFile: async () => {},
      toggle: async (id, file) => {
        content.set(id, (content.get(id) ?? []).map((c) => (c.file === file ? { ...c, enabled: !c.enabled, file: c.enabled ? `${c.file}.disabled` : c.file.replace(/\.disabled$/, '') } : c)))
      },
      remove: async (id, file) => {
        content.set(id, (content.get(id) ?? []).filter((c) => c.file !== file))
      },
      update: async (id, files) => {
        await fakeTask(`Updating ${files.length} items`, 6)
        content.set(id, (content.get(id) ?? []).map((c) => (files.some((f) => f.file === c.file) && c.update ? { ...c, update: null, version: { id: 'new', number: c.update.number } } : c)))
      },
      installedProjects: async (id) => {
        // Resolve sample slugs to real Modrinth ids so "Installed" matches live search results.
        const items = content.get(id) ?? []
        const slugs = items.map((c) => c.project?.slug).filter(Boolean) as string[]
        const real = await live(() => webModrinth.projects(slugs), async () => [])
        return [...items.map((c) => c.project?.id), ...real.map((p) => p.id)].filter(Boolean) as string[]
      }
    },
    worlds: {
      list: async () => [
        { folder: 'New World', name: 'Survival with friends', lastPlayed: now - 3600_000, gameMode: 'Survival', iconUrl: shot(110, '') },
        { folder: 'Creative', name: 'Build world', lastPlayed: now - 5 * 86400000, gameMode: 'Creative', iconUrl: shot(200, '') },
        { folder: 'HC', name: 'Hardcore #3', lastPlayed: now - 40 * 86400000, gameMode: 'Hardcore', iconUrl: null }
      ],
      remove: async () => {},
      servers: async () => [
        { name: 'Hypixel', ip: 'mc.hypixel.net', iconUrl: icon('H', 45) },
        { name: 'Local server', ip: 'localhost:25565', iconUrl: null }
      ],
      addServer: async (_id, s) => [{ name: 'Hypixel', ip: 'mc.hypixel.net', iconUrl: icon('H', 45) }, { ...s, iconUrl: null }],
      removeServer: async () => []
    },
    screenshots: {
      list: async () => [0, 1, 2, 3, 4, 5].map((n) => ({ file: `2025-10-0${n + 1}_18.22.0${n}.png`, url: shot(n * 50 + 90, `2025-10-0${n + 1}`), mtime: now - n * 86400000 })),
      remove: async () => {}
    },
    files: {
      list: async (_id, dir) =>
        dir === ''
          ? ['config', 'logs', 'mods', 'resourcepacks', 'saves', 'screenshots', 'shaderpacks'].map((name) => ({ name, path: name, dir: true, size: 0, mtime: now })).concat([
              { name: 'options.txt', path: 'options.txt', dir: false, size: 5_400, mtime: now },
              { name: 'servers.dat', path: 'servers.dat', dir: false, size: 180, mtime: now }
            ])
          : [
              { name: 'sodium-options.json', path: `${dir}/sodium-options.json`, dir: false, size: 820, mtime: now },
              { name: 'iris.properties', path: `${dir}/iris.properties`, dir: false, size: 210, mtime: now }
            ],
      read: async (_id, p) => (p.endsWith('.json') ? '{\n  "quality": {\n    "weather_quality": "FAST"\n  }\n}\n' : 'version:3955\nfov:0.25\nrenderDistance:16\nmaxFps:260\nguiScale:2\n'),
      write: async () => {},
      remove: async () => {},
      reveal: async () => {}
    },
    logs: {
      list: async () => [
        { name: 'latest.log', path: 'logs/latest.log', kind: 'log', mtime: now - 3600_000, size: 48_000 },
        { name: 'crash-2025-10-02_19.04.11-client.txt', path: 'crash-reports/crash.txt', kind: 'crash', mtime: now - 2 * 86400000, size: 12_000 },
        { name: '2025-10-01-1.log.gz', path: 'logs/2025-10-01-1.log.gz', kind: 'log', mtime: now - 3 * 86400000, size: 9_000 }
      ],
      read: async () =>
        [
          '[18:22:01] [main/INFO]: Loading Minecraft 26.3 with Fabric Loader 0.20.1',
          '[18:22:01] [main/INFO]: Loading 9 mods:',
          '\t- fabricloader 0.20.1',
          '\t- sodium 0.9.3+mc26.3',
          '[18:22:03] [main/WARN]: Mod resource pack "lithium" has no pack.mcmeta',
          '[18:22:05] [Render thread/INFO]: Setting user: Player',
          '[18:22:06] [Render thread/INFO]: Backend library: LWJGL version 3.3.3',
          '[18:22:09] [Render thread/ERROR]: Failed to load texture minecraft:textures/missing.png',
          '[18:22:10] [Render thread/INFO]: Reloading ResourceManager: vanilla, fabric, sodium',
          '[18:22:14] [Render thread/INFO]: Sound engine started'
        ].join('\n')
    },
    modrinth: {
      search: (q) => live(() => webModrinth.search(q), async () => {
        await wait(250)
        let hits = HITS.filter((h) => h.project_type === q.type)
        if (q.query) hits = hits.filter((h) => `${h.title} ${h.description}`.toLowerCase().includes(q.query.toLowerCase()))
        if (q.loaders.length) hits = hits.filter((h) => q.loaders.some((l) => h.categories.includes(l)))
        for (const c of q.categories) hits = hits.filter((h) => h.categories.includes(c))
        if (q.sort === 'downloads') hits = [...hits].sort((a, b) => b.downloads - a.downloads)
        if (q.sort === 'follows') hits = [...hits].sort((a, b) => b.follows - a.follows)
        return { hits: hits.slice(q.offset, q.offset + q.limit), offset: q.offset, limit: q.limit, total_hits: hits.length }
      }),
      project: (id) => live(() => webModrinth.project(id), async () => toProject(hitBy(id))),
      versions: (id, filter) => live(() => webModrinth.versions(id, filter), async () => versionsFor(hitBy(id))),
      members: (id) => live(() => webModrinth.members(id), async () => [
        { role: 'Owner', user: { username: 'jellysquid3', avatar_url: icon('J', 140) } },
        { role: 'Developer', user: { username: 'IMS', avatar_url: icon('I', 260) } }
      ]),
      categories: () => live(() => webModrinth.categories(), async () => CATEGORIES),
      gameVersions: () => live(() => webModrinth.gameVersions(), async () => MC.map((version) => ({ version, version_type: 'release', date: '', major: false }))),
      installModpack: async (id) => {
        const p = await live(() => webModrinth.project(id), async () => toProject(hitBy(id)))
        const h = { ...(HITS.find((x) => x.slug === p.slug) ?? HITS[12]), title: p.title, slug: p.slug, project_id: p.id, icon_url: p.icon_url }
        await fakeTask(`Installing ${h.title}`, 15)
        const inst = mkInst(h.slug, h.title, '26.3', '0.20.1', 300, null, { projectId: h.project_id, versionId: 'v', title: h.title })
        inst.iconUrl = h.icon_url
        instances = [...instances, inst]
        content.set(inst.id, contentFor(inst))
        changed()
        return inst
      }
    },
    updater: {
      // Browser preview: pretend an update has finished downloading so the button can be seen.
      state: async () => ({ status: 'ready', current: '0.3.0', version: '0.3.1', progress: 1 }),
      check: async () => ({ status: 'ready', current: '0.3.0', version: '0.3.1', progress: 1 }),
      install: async () => void alert('In the desktop app this restarts into the new version.'),
      onChanged: () => () => {}
    },
    importer: {
      // Browser preview: example sources (the desktop app scans your real folders).
      scan: async () => {
        await wait(700)
        return [
          { id: 'l', launcher: 'lunar', name: 'Lunar Client · lunar / 1.21', path: 'C:\\Users\\you\\.lunarclient\\profiles\\lunar\\1.21', mcVersion: '1.21', loader: 'fabric', counts: { mods: 14, resourcepacks: 3, shaderpacks: 2, saves: 4 } },
          { id: 'm1', launcher: 'modrinth', name: 'Fabulously Optimized', path: 'C:\\Users\\you\\AppData\\Roaming\\ModrinthApp\\profiles\\Fabulously Optimized', mcVersion: null, loader: null, counts: { mods: 52, resourcepacks: 1, shaderpacks: 0, saves: 2 } },
          { id: 'm2', launcher: 'modrinth', name: 'All the Mods 10', path: 'C:\\Users\\you\\AppData\\Roaming\\ModrinthApp\\profiles\\All the Mods 10', mcVersion: '1.21.1', loader: 'neoforge', counts: { mods: 412, resourcepacks: 0, shaderpacks: 0, saves: 1 } },
          { id: 'd', launcher: 'dawn', name: 'Dawn · profiles / default', path: 'C:\\Users\\you\\AppData\\Roaming\\.dawn\\profiles\\default', mcVersion: '26.3', loader: 'fabric', counts: { mods: 9, resourcepacks: 2, shaderpacks: 1, saves: 0 } },
          { id: 'v', launcher: 'minecraft', name: 'Minecraft Launcher', path: 'C:\\Users\\you\\AppData\\Roaming\\.minecraft', mcVersion: null, loader: null, counts: { mods: 0, resourcepacks: 5, shaderpacks: 0, saves: 7 } }
        ]
      },
      describeFolder: async () => {
        throw new Error('Browsing folders only works in the desktop app.')
      },
      detectVersion: async () => {
        await wait(600)
        return '1.21.1'
      },
      run: async (input) => {
        await fakeTask(`Importing ${input.name}`, 8)
        const inst = mkInst(input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), input.name, input.mcVersion, '0.20.1', 120, null)
        inst.iconPreset = input.iconPreset ?? null
        instances = [...instances, inst]
        content.set(inst.id, [])
        changed()
        return { instanceId: inst.id, mods: 12, resourcepacks: 3, shaderpacks: 2, saves: 4, other: ['mod configs', 'game options & keybinds', 'server list'], skipped: [{ file: 'jei-forge-1.21.1.jar', reason: 'Forge mod' }, { file: 'create-neoforge.jar', reason: 'NeoForge mod' }] }
      }
    },
    wardrobe: {
      // Live catalogue when the PandaClient server is reachable, else the copy in the repo.
      catalog: () => live(async () => {
        const res = await fetch(`${PANDA_API}/cosmetics`)
        if (!res.ok) throw new Error()
        return (await res.json()) as Cosmetic[]
      }, async () => seedCosmetics as unknown as Cosmetic[]),
      loadout: async () => loadout,
      saveLoadout: async (l) => (loadout = { ...l }),
      profile: async () => {
        const acc = accounts.find((a) => a.active)
        if (!acc) throw new Error('Sign in first')
        return { id: acc.uuid, name: acc.username, skin: null, capes: [] }
      },
      uploadSkin: async () => {
        throw new Error('Skin uploads only work in the desktop app.')
      },
      resetSkin: async () => ({ id: '', name: '', skin: null, capes: [] }),
      setCape: async () => ({ id: '', name: '', skin: null, capes: [] }),
      readImage: async () => {
        throw new Error('Only in the desktop app')
      }
    },
    online: {
      // Real count only; null (hidden) when the server can't be reached.
      count: () => live(async () => {
        const res = await fetch(`${PANDA_API}/online`)
        if (!res.ok) throw new Error()
        return ((await res.json()) as { online: number }).online
      }, async () => null),
      onChanged: () => () => {}
    },
    tasks: {
      list: async () => tasks,
      dismiss: async (id) => {
        tasks = tasks.filter((t) => t.id !== id)
        emitTasks()
      },
      onChanged: (cb) => (taskListeners.add(cb), () => taskListeners.delete(cb))
    },
    auth: {
      // Browser preview: a pretend account (real sign-in only exists in the Electron app).
      list: async () => accounts,
      login: async () => {
        const acc = { uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5', username: 'PandaPlayer', active: true }
        accounts = [...accounts.map((a) => ({ ...a, active: false })), acc]
        return acc
      },
      logout: async (uuid) => (accounts = accounts.filter((a) => a.uuid !== uuid)),
      setActive: async (uuid) => (accounts = accounts.map((a) => ({ ...a, active: a.uuid === uuid })))
    },
    game: {
      stop: async (id) => emit({ instanceId: id, stage: 'idle', progress: null, message: '' }),
      running: async () => [],
      launch: async (id) => {
        const inst = find(id)
        emit({ instanceId: id, stage: 'preparing', progress: null, message: `Preparing ${inst.name}…` })
        await wait(600)
        for (let i = 0; i <= 20; i++) {
          emit({ instanceId: id, stage: 'downloading', progress: i / 20, message: `Downloading Minecraft ${inst.mcVersion} (preview)` })
          await wait(80)
        }
        emit({ instanceId: id, stage: 'launching', progress: null, message: 'Starting game…' })
        await wait(700)
        instances = instances.map((i) => (i.id === id ? { ...i, lastPlayed: new Date().toISOString() } : i))
        changed()
        emit({ instanceId: id, stage: 'idle', progress: null, message: '' })
      },
      onProgress: (cb) => (progressListeners.add(cb), () => progressListeners.delete(cb))
    }
  }
}
