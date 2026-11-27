package com.pandaclient.mod.util;

import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.Minecraft;

import java.nio.file.Files;
import java.nio.file.Path;

/** Tells the launcher the game started fine (used by the crash finder): writes instance/pandaclient/started. */
public final class StartMarker {
    private StartMarker() {}
    private static boolean done;

    public static void tick(Minecraft mc) {
        if (done || mc.getOverlay() != null || mc.screen == null) return;
        done = true;
        try {
            Path f = FabricLoader.getInstance().getGameDir().resolve("pandaclient").resolve("started");
            Files.createDirectories(f.getParent());
            Files.writeString(f, String.valueOf(System.currentTimeMillis()));
        } catch (Exception ignored) {}
    }
}
