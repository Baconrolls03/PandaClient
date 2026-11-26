# PandaClient

A simple, clean, Fabric-only Minecraft: Java Edition launcher. You get Feather-style one-click play and a
Modrinth-style library: any version Fabric supports, and Fabric mods, modpacks, resource packs, shaders
and data packs straight from Modrinth.

See [PLAN.md](./PLAN.md) for the roadmap and folder structure.

## Download (Windows)

Every push builds a Windows installer on GitHub:

1. Open the repository on GitHub, go to **Actions** → **Build PandaClient**, and open the latest green run.
2. Under **Artifacts**, download **PandaClient-Windows-Installer** and unzip it.
3. Run `PandaClient-Setup-<version>.exe`. The installer isn't code-signed yet, so Windows SmartScreen
   may say "Windows protected your PC": click **More info → Run anyway**.

## Development

```bash
npm install
npm run dev        # Electron app with hot reload
npm run dev:web    # UI only, in a browser, with mocked launcher APIs
npm run typecheck
npm test           # main-process services against a fake Modrinth server
npm run test:live  # same services against the real Modrinth / Mojang / loader APIs (downloads real files)
npm run dist:win   # build the Windows installer into release/
```

Minecraft game files are never bundled. They are always downloaded from Mojang at runtime.
