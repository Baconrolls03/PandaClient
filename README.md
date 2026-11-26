# PandaClient

A simple, clean Minecraft: Java Edition launcher. Fabric + Sodium, Lithium, Iris and Fabric API
installed for you, on any Minecraft version you pick.

See [PLAN.md](./PLAN.md) for the roadmap and folder structure.

## Development

```bash
npm install
npm run dev        # Electron app with hot reload
npm run dev:web    # UI only, in a browser, with mocked launcher APIs
npm run typecheck
```

Minecraft game files are never bundled. They are always downloaded from Mojang at runtime.
