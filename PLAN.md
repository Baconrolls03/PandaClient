# PandaClient — Plan

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
├── assets/
│   ├── logo.svg            # vector panda (created)
│   └── logo.png            # ← your PNG goes here
├── build/                  # electron-builder icons (icon.ico / icon.png) — later
├── src/
│   ├── shared/
│   │   └── types.ts        # types shared by main ⇄ preload ⇄ renderer (IPC contract)
│   ├── main/               # Electron main process (Node)
│   │   ├── index.ts        # frameless BrowserWindow, app lifecycle
│   │   ├── ipc.ts          # registers every ipcMain.handle
│   │   └── services/
│   │       ├── settings.ts # JSON settings in userData
│   │       ├── versions.ts # Mojang manifest + Fabric Meta → VersionInfo[]
│   │       ├── java.ts     # Java auto-detect (JAVA_HOME, PATH, common dirs)
│   │       ├── auth.ts     # msmc login, token refresh, safeStorage   (step 2)
│   │       ├── fabric.ts   # write Fabric profile JSON into versions/  (step 4)
│   │       ├── modrinth.ts # resolve + download curated mods           (step 4)
│   │       └── launcher.ts # MCLC launch + progress events             (step 5)
│   ├── preload/
│   │   └── index.ts        # contextBridge → window.panda
│   └── renderer/           # React UI
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── styles.css  # Tailwind + colour tokens
│           ├── lib/api.ts  # typed access to window.panda (+ browser mock for UI dev)
│           ├── components/ # TitleBar, Sidebar, PlayButton, VersionSelect, NewsCard, …
│           └── pages/      # Home, Settings (Mods, Browse later)
├── electron.vite.config.ts
├── electron-builder.yml    # (step 6)
└── package.json
```

### Game directory layout (on the user's PC)

```
%APPDATA%/.pandaclient/            (default, changeable in Settings)
├── assets/ libraries/ versions/   # shared Mojang downloads (MCLC)
├── runtime/                       # Mojang Java runtimes (Java 8/17/21/25 as each version needs)
└── instances/
    └── 1.21.10/                   # one folder per MC version
        ├── mods/                  # Fabric API, Sodium, Lithium, Iris (+ user mods later)
        ├── saves/ resourcepacks/ shaderpacks/ options.txt
        └── panda.json             # which mods we installed + their Modrinth version ids
```

## Build steps

1. **UI shell + theme** ✅ *(this step)*: frameless window, custom title bar, sidebar, Home
   (Play, version selector, news card, progress bar), Settings page with persisted settings,
   Java auto-detect, live version list.
2. **Microsoft login (msmc)**: login popup, store refresh token with Electron `safeStorage`,
   show skin head (`https://mc-heads.net/avatar/<uuid>`) and username, logout.
3. **Java runtime**: use the detected Java if its major version is high enough, otherwise download
   Mojang's own runtime (`piston-meta` java manifest) into `runtime/`. Version → Java mapping
   comes from each version JSON's `javaVersion.majorVersion`.
4. **Fabric + curated mods**: fetch the Fabric profile for the chosen version; for each curated
   project (`fabric-api`, `sodium`, `lithium`, `iris`) query
   `GET /v2/project/{slug}/version?loaders=["fabric"]&game_versions=["<v>"]`, take the newest
   release, verify the sha1, write it to `instances/<v>/mods`. Versions where a curated mod doesn't exist
   yet still launch, with a "Sodium not available for this version" note.
5. **Launch (MCLC)**: stream `download-status`/`progress` to the progress bar, handle
   "close launcher on launch", and show the game log on crash.
6. **Packaging**: electron-builder NSIS installer, app icon from `assets/logo.png`.

### Later (not now)
- PandaClient Fabric mod: HUD with FPS, keystrokes, CPS, armour status
- Mod browser (Modrinth search, dependency resolution, enable/disable toggles)
- Auto-updater (electron-updater + GitHub Releases)

## Default version

The brief says "latest 1.21.x". Mojang has since moved to year-based versions (26.x), so the
selector lists **every** release Fabric supports. It defaults to the newest release, and from step 4 on it
will prefer the newest one where all four curated mods are available.
