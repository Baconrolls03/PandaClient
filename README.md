# PandaClient

A fast, clean Minecraft: Java Edition launcher and PvP client for Fabric.

- **PandaClient mod built in:** a PvP HUD (FPS, CPS, keystrokes, armour, potions…), zoom, freelook,
  toggle sprint, hitboxes, custom crosshair, 1.7 animations, capes and more, all in one in-game menu (Right Shift)
- **Fast by default:** Sodium, Lithium, FerriteCore, Entity Culling, Dynamic FPS and other performance mods are
  installed and kept up to date for you, and Java is started with smooth-FPS settings
- **Profiles:** separate setups with their own mods and worlds; move your mods to a new Minecraft version in one click
- **Mods from Modrinth:** browse and install mods, modpacks, resource packs and shaders
- **Friends:** see what server friends are on, join them, send party invites and share profiles
- **Crash finder:** works out which mod is crashing the game, and fixes duplicate mods automatically
- **Cloud sync:** your HUD layout and in-game settings follow you to any PC
- Minecraft files always come from Mojang, and your Microsoft password and Minecraft token are never sent to PandaClient

Supports Minecraft 1.21.6 – 1.21.11 (Fabric).

## Download (Windows)

Get the latest `PandaClient-Setup-<version>.exe` from **[Releases](https://github.com/Baconrolls03/PandaClient/releases/latest)** and run it.

## Code signing policy

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org).

- Releases are built from this repository by GitHub Actions and signed only from that build; nothing is signed by hand.
- Committers and reviewers: [@Baconrolls03](https://github.com/Baconrolls03). Approver: [@Baconrolls03](https://github.com/Baconrolls03).
- Privacy: see [PRIVACY.md](PRIVACY.md). PandaClient doesn't send anything to other networked systems unless the player uses a feature that needs it.

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
