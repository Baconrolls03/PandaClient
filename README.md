# PandaClient

A simple, clean, Fabric-only Minecraft: Java Edition launcher.

- One-click setup: latest Minecraft + Fabric + Sodium, Lithium, Iris and Fabric API
- Browse and install mods, modpacks, resource packs, shaders and data packs from Modrinth
- Separate instances, each with its own mods, worlds, screenshots and settings
- Minecraft files are always downloaded from Mojang, never bundled

> Still in development: **Play** and **Microsoft sign-in** don't work yet.

## Download (Windows)

1. On GitHub, open **Actions** → **Build PandaClient** → the newest run with a green tick.
2. Under **Artifacts**, download **PandaClient-Windows-Installer** and unzip it.
3. Run `PandaClient-Setup-<version>.exe`. If Windows says "Windows protected your PC",
   click **More info → Run anyway** (the installer isn't code-signed yet).

## Run from source

Needs [Node.js 22](https://nodejs.org) and [Git](https://git-scm.com).

```bash
git clone https://github.com/Baconrolls03/PandaClient.git
cd PandaClient
npm install
npm run dev
```

### Developer commands

```bash
npm run dev:web    # UI only, in a browser
npm run typecheck
npm test           # launcher services against a fake Modrinth server
npm run test:live  # same, against the real Modrinth / Mojang / Fabric APIs
npm run dist:win   # build the Windows installer into release/
```
