# PandaClient

A simple, clean, Fabric-only Minecraft: Java Edition launcher.

- One-click setup: latest Minecraft + Fabric + Sodium, Lithium, Iris and Fabric API
- Browse and install mods, modpacks, resource packs, shaders and data packs from Modrinth
- Separate instances, each with its own mods, worlds, screenshots and settings
- Minecraft files are always downloaded from Mojang, never bundled

> Still in development: **Play** and **Microsoft sign-in** don't work yet.

## Download (Windows)

Get the latest `PandaClient-Setup-<version>.exe` from **[Releases](https://github.com/Baconrolls03/PandaClient/releases/latest)** and run it.
If Windows says "Windows protected your PC", click **More info → Run anyway** (the installer isn't code-signed yet).

PandaClient updates itself: when a new version is out it downloads in the background and a
**Restart to update** button appears in the title bar.

### Releasing a new version

Bump `version` in `package.json` and push to `main`. GitHub Actions builds the installer and
publishes it as release `v<version>`; installed copies pick it up automatically.

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
