# PandaClient backend (Supabase project `pandaclient`)

- `migrations/`: database schema (players, sessions, challenges, cosmetics, loadouts) with row level security
- `seed/cosmetics.json`: the cosmetics catalogue (`seed/cosmetics.sql` loads it)
- `functions/api/`: the `api` edge function

## API — `https://yljkeadmxsmwiclrbvgp.supabase.co/functions/v1/api`

| Route | Auth | What |
|---|---|---|
| `POST /auth/challenge` | – | one-time `serverId` |
| `POST /auth/verify` `{username, serverId}` | – | after the launcher calls Mojang's `session/minecraft/join`, checks `hasJoined` and returns a PandaClient session `token` |
| `GET /online` | – | real number of players seen in the last 2 minutes |
| `GET /loadouts?uuids=a,b` | – | what those players have equipped (used by the in-game mod) |
| `GET /me` | session | your profile + loadout |
| `PUT/POST /loadout` `{equipped}` | session | save your loadout (unknown items are dropped) |
| `POST /heartbeat` | session | mark yourself online |

The player's Minecraft access token is only ever sent to Mojang, never to this API.
