package com.pandaclient.mod.util;

import net.minecraft.client.Minecraft;
import net.minecraft.world.level.levelgen.Heightmap;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Only active when PANDACLIENT_CI_SCENES=1 (the "lobby scenes" GitHub Actions job): in a real generated world,
 * finds good-looking places (a cherry grove, a meadow, mountain peaks...), stands there at sunset or sunrise looking
 * out over the most open view, and captures the lobby's 3D panorama. The pictures ship with PandaClient as the
 * lobby's built-in places.
 */
public final class CiScenes {
    private CiScenes() {}
    public static final boolean ON = System.getenv("PANDACLIENT_CI_SCENES") != null;

    /** Biome, time of day. */
    private static final String[][] SPOTS = {
        {"minecraft:cherry_grove", "12350"},
        {"minecraft:meadow", "23300"},
        {"minecraft:jagged_peaks", "11800"},
        {"minecraft:beach", "12450"},
        {"minecraft:snowy_slopes", "12200"},
    };
    private static final Pattern AT = Pattern.compile("\\[(-?\\d+), (?:-?\\d+|~), (-?\\d+)\\]");

    private static int spot, step, wait, slot = -1, found, lastChunks, stable, tries;
    private static int fx, fz;
    private static volatile String located;
    private static boolean registered;

    private static void log(String s) { System.out.println("[PandaClient CI] scenes: " + s); System.out.flush(); }

    private static void heard(String text) {
        log("heard: " + (text.length() > 160 ? text.substring(0, 160) : text));
        Matcher m = AT.matcher(text);
        if (m.find()) located = m.group(1) + " " + m.group(2);
    }

    public static void tick(Minecraft mc) {
        if (!ON || mc.player == null || mc.level == null || mc.getOverlay() != null) return;
        if (!registered) {
            registered = true;
            net.fabricmc.fabric.api.client.message.v1.ClientReceiveMessageEvents.GAME.register((msg, overlay) -> heard(msg.getString()));
            net.fabricmc.fabric.api.client.message.v1.ClientReceiveMessageEvents.CHAT.register((msg, signed, sender, params, time) -> heard(msg.getString()));
            mc.player.connection.sendCommand("gamerule advance_time false");
            mc.player.connection.sendCommand("gamerule advance_weather false");
            mc.player.connection.sendCommand("gamerule doDaylightCycle false");
            mc.player.connection.sendCommand("gamerule doWeatherCycle false");
            mc.player.connection.sendCommand("weather clear");
            mc.player.connection.sendCommand("gamemode creative");
            wait = 60;
        }
        if (wait > 0) { wait--; return; }
        var cmd = mc.player.connection;
        if (spot >= SPOTS.length) {
            log("done, " + found + " places");
            mc.stop();
            spot = Integer.MAX_VALUE / 2;
            return;
        }
        String biome = SPOTS[spot][0];
        switch (step) {
            case 0 -> { located = null; cmd.sendCommand("locate biome " + biome); step = 1; wait = 10; stable = 0; }
            case 1 -> {
                if (located != null) {
                    String[] xz = located.split(" ");
                    fx = Integer.parseInt(xz[0]); fz = Integer.parseInt(xz[1]);
                    log(biome + " at " + fx + "," + fz);
                    cmd.sendCommand("tp @s " + fx + " 250 " + fz);
                    step = 2; wait = 40; lastChunks = -1; stable = 0; tries = 0;
                } else if (++stable > 600) { log(biome + " not found"); next(); }
            }
            case 2 -> {
                // wait until the chunks around have arrived and stopped changing
                int chunks = mc.level.getChunkSource().getLoadedChunksCount();
                stable = chunks == lastChunks ? stable + 1 : 0;
                lastChunks = chunks;
                int y = mc.level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, fx, fz);
                boolean loaded = mc.level.getChunkSource().hasChunk(fx >> 4, fz >> 4) && y > mc.level.getMinY() + 2;
                if (++tries > 2400) { log(biome + ": land never loaded"); next(); return; }
                if (loaded && stable > 60) {
                    // look out over the most open direction (lowest ground 20 to 60 blocks away), with level
                    // ground just in front to stand everyone on
                    int best = 0; double bestH = Double.MAX_VALUE;
                    for (int d = 0; d < 16; d++) {
                        double yaw = d * 22.5, h = 0;
                        double sx = -Math.sin(Math.toRadians(yaw)), sz = Math.cos(Math.toRadians(yaw));
                        int near = mc.level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, fx + (int) Math.round(sx * 3), fz + (int) Math.round(sz * 3));
                        if (Math.abs(near - y) > 1) h += 10_000;
                        for (int r = 20; r <= 60; r += 8)
                            h += mc.level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, fx + (int) Math.round(sx * r), fz + (int) Math.round(sz * r));
                        if (h < bestH) { bestH = h; best = d; }
                    }
                    float yaw = best * 22.5f;
                    cmd.sendCommand("tp @s " + (fx + 0.5) + " " + y + " " + (fz + 0.5) + " " + yaw + " 0");
                    cmd.sendCommand("time set " + SPOTS[spot][1]);
                    log(biome + ": standing at y " + y + " looking " + yaw);
                    step = 3; wait = 200; stable = 0; lastChunks = -1; tries = 0;
                }
            }
            case 3 -> {
                int chunks = mc.level.getChunkSource().getLoadedChunksCount();
                stable = chunks == lastChunks ? stable + 1 : 0;
                lastChunks = chunks;
                if (stable > 100 || ++tries > 1500) {
                    LobbyPanorama.allowNow();
                    slot = LobbyPanorama.capture(mc);
                    log(biome + ": captured slot " + slot + " onGround " + mc.player.onGround());
                    step = 4; wait = 80;
                }
            }
            case 4 -> {
                try {
                    Path out = net.fabricmc.loader.api.FabricLoader.getInstance().getGameDir().resolve("ci-scenes");
                    Files.createDirectories(out);
                    String name = biome.substring(biome.indexOf(':') + 1);
                    for (int i = 0; i < 6; i++) Files.copy(LobbyPanorama.facePath(slot, i), out.resolve(name + "_" + i + ".png"), StandardCopyOption.REPLACE_EXISTING);
                    Path st = LobbyPanorama.stagePath(slot);
                    if (Files.exists(st)) Files.copy(st, out.resolve(name + ".stage"), StandardCopyOption.REPLACE_EXISTING);
                    found++;
                    log(biome + ": saved");
                } catch (Exception e) {
                    log(biome + ": couldn't save " + e);
                }
                next();
            }
            default -> next();
        }
    }

    private static void next() { spot++; step = 0; wait = 20; }
}
