# PandaClient — Plan

**Fabric-only.** Every instance runs Fabric. Discover only shows Fabric mods and modpacks and Iris shaders (resource packs and data packs work everywhere). That keeps launching simple, since Fabric is just a version profile on top of vanilla, and it matches Feather. Fabric supports Minecraft 1.14 and newer.

A lightweight, clean Minecraft: Java Edition launcher in the spirit of Feather / Modrinth App:
one big Play button, any Minecraft version, Fabric + a curated performance mod set installed
automatically, and (later) anything else straight from Modrinth.

## What we're borrowing from Feather & Modrinth App

| Idea | Feather | Modrinth App | PandaClient |
|---|---|---|---|
| Pick from many MC versions | ✅ version dropdown on Play | ✅ per-instance version | ✅ live list from Mojang + Fabric Meta, releases by default, snapshots toggle |
| One-click optimised Fabric | ✅ bundled perf mods | ❌ manual | ✅ Fabric + Sodium, Lithium, Iris, Fabric API auto-installed per version |
| Install mods from Modrinth | ✅ browse tab | ✅ full browser, deps auto-resolved | 🔜 v2 mod browser (same Modrinth API we use for the curated set) |
| Separate installs per version | profiles | instances | one **profile per MC version** under `instances/<version>/` so mods never clash |
| Toggle mods on/off | ✅ | ✅ | 🔜 v2 (rename `.jar` ↔ `.jar.disabled`) |
| Never ship Mojang files | ✅ | ✅ | ✅ everything downloaded from Mojang at runtime |

## Tech

- **Electron + electron-vite**: main / preload / renderer split, HMR in dev
- **React 18 + TypeScript + Tailwind v4**: theme tokens live in `src/renderer/src/styles.css` (`@theme`)
- **Inter Variable** via `@fontsource-variable/inter` (bundled, works offline)
- **lucide-react** icons
- **minecraft-launcher-core (MCLC)**: downloads assets/libraries from Mojang and launches
- **msmc**: Microsoft → Xbox → Minecraft auth
- **Fabric Meta API** (`meta.fabricmc.net/v2`): loader + launcher profile JSON per game version
- **Modrinth API** (`api.modrinth.com/v2`): curated mods now, mod browser later
- **electron-builder**: Windows NSIS installer first; macOS/Linux targets kept in config

Security: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and a single typed
`window.panda` bridge. The renderer never touches Node or the network directly.

## Folder structure

```
.
├── assets/                 logo.svg (+ your logo.png)
├── src/
│   ├── shared/types.ts     IPC contract: Settings, Instance, ContentItem, Modrinth types, PandaApi
│   ├── main/               Electron main process (Node)
│   │   ├── index.ts        frameless window, panda:// protocol, lifecycle
│   │   ├── ipc.ts          every ipcMain.handle
│   │   └── services/
│   │       ├── http.ts         fetch/download with sha1 check, concurrency pool, User-Agent
│   │       ├── tasks.ts        download/progress tracker → Downloads panel
│   │       ├── modrinth.ts     search, projects, versions, hashes → versions, update lookup, tags
│   │       ├── loaders.ts      Fabric loader versions
│   │       ├── instances.ts    create, list, update, icon, duplicate, delete (to Recycle Bin)
│   │       ├── content.ts      scan + identify files, install with dependencies, toggle, update
│   │       ├── mrpack.ts       modpack install, .mrpack import & export
│   │       ├── instanceFiles.ts worlds (level.dat), servers.dat, screenshots, files, logs
│   │       ├── nbt.ts          tiny NBT reader/writer
│   │       ├── paths.ts        safeJoin (blocks ../ escapes), panda:// URLs
│   │       ├── settings.ts / versions.ts / java.ts
│   │       ├── auth.ts         msmc login                  (next)
│   │       └── launcher.ts     MCLC launch, preview for now (next)
│   ├── preload/index.ts    contextBridge → window.panda
│   └── renderer/src/
│       ├── lib/            api (+ browser mock), store (routing, toasts, tasks), format, markdown
│       ├── components/     TitleBar, Sidebar, PlayBar, TasksPanel, cards, ui primitives
│       ├── modals/         CreateInstance, Install, DeleteInstance
│       └── pages/          Home, Library, Discover, Project, Settings, instance/* (6 tabs)
```

### Game directory layout (on the user's PC)

```
%APPDATA%/.pandaclient/            (default, changeable in Settings)
├── assets/ libraries/ versions/   # shared Mojang downloads (MCLC)
├── runtime/                       # Mojang Java runtimes (Java 8/17/21/25 as each version needs)
└── instances/
    └── my-instance/               # one folder per instance
        ├── mods/                  # Fabric API, Sodium, Lithium, Iris (+ user mods later)
        ├── saves/ resourcepacks/ shaderpacks/ options.txt
        ├── instance.json          # name, version, loader, overrides
        └── .panda/content.json    # file hashes → Modrinth project/version cache
```

## Build steps

1. ✅ **UI shell + theme**: frameless window, title bar, settings, Java detect, live version list.
2. ✅ **Modrinth-style library**:
   - Fabric instances for any version Fabric supports (Vanilla, Quilt, Forge and NeoForge were dropped in favour of Fabric-only).
   - Discover with filters for all five project types (Fabric-filtered), project pages, installs that resolve dependencies.
   - Fabric modpack install, import and export. Modpacks for other loaders are refused up front.
   - Update checks.
   - Content, Worlds (with servers), Screenshots, Files, Logs and Settings for each instance.
   - Feather-style play bar and downloads panel.
3. **Microsoft login (msmc)**: login popup, refresh token in Electron `safeStorage`, skin head and username.
4. **Java runtime**: use detected Java when its major version fits, otherwise download Mojang's runtime.
5. **Launch (MCLC)**: install vanilla through MCLC, write Fabric Meta's profile JSON into `versions/`, launch it,
   stream progress to the play bar, and honour "close launcher on launch".
6. **Packaging**: electron-builder NSIS installer, app icon from `assets/logo.png`.

### Later (not now)
- PandaClient Fabric mod: HUD with FPS, keystrokes, CPS, armour status
- Auto-updater (electron-updater + GitHub Releases)

## Default version

The brief says "latest 1.21.x". Mojang has since moved to year-based versions (26.x), so the
selector lists **every** release Fabric supports. It defaults to the newest release, and from step 4 on it
will prefer the newest one where all four curated mods are available.
