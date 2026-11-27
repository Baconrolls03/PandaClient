# PandaClient privacy policy

PandaClient is a Minecraft launcher and in-game mod. This page explains what it sends where.

## Signing in

You sign in with your Microsoft account through Microsoft's own sign-in page. PandaClient never sees your
password. Your Minecraft access token is only ever sent to Mojang and Microsoft (to start the game and to prove
you own your account). It is never sent to PandaClient's server.

## What the PandaClient server stores

PandaClient's online features use a server hosted on Supabase. When you use them it stores:

- your Minecraft **username and UUID**, and when you were last online
- the **server address** you're playing on, shown only to people on your friends list
- your **friends list**, friend requests and party invites
- the **cosmetics** (capes, hats…) you picked in the Wardrobe, so other PandaClient players can see them
- **profiles you share** with other players (a .mrpack file with your mod list and settings), until the person you sent it to accepts or dismisses it
- your **PandaClient settings** (HUD layout, which PandaClient mods are on) if cloud sync is on. It can be turned off in Settings → Behavior.

None of this is sold or shared with anyone else, and it's only used to run these features.

## What is downloaded from other services

- Minecraft and Java come from Mojang. Fabric comes from FabricMC.
- Mods, modpacks and their icons come from Modrinth.
- Player heads shown in the launcher come from mc-heads.net, which receives the player's UUID.

## Removing your data

Open an issue at https://github.com/Baconrolls03/PandaClient/issues asking for your data to be removed, and it
will be deleted. Deleting the launcher removes everything it stored on your PC.
