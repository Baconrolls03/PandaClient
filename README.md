# PandaClient

A simple, clean Minecraft: Java Edition launcher. You get Feather-style one-click play and a Modrinth-style
library: any version, any loader, and mods, modpacks, resource packs, shaders and data packs
straight from Modrinth.

See [PLAN.md](./PLAN.md) for the roadmap and folder structure.

## Development

```bash
npm install
npm run dev        # Electron app with hot reload
npm run dev:web    # UI only, in a browser, with mocked launcher APIs
npm run typecheck
npm test           # main-process services against a fake Modrinth server
npm run test:live  # same services against the real Modrinth / Mojang / loader APIs (downloads real files)
```

Minecraft game files are never bundled. They are always downloaded from Mojang at runtime.
