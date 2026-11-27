package com.pandaclient.mod.util;

import com.mojang.blaze3d.platform.NativeImage;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Screenshot;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.resources.Identifier;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * "Where you left" lobby background: a snapshot of the game taken when the pause menu opens, shown behind the
 * main menu after you leave the world or server (like OneClient's lobby).
 */
public final class LobbySnapshot {
    private LobbySnapshot() {}

    public static final Identifier ID = Identifier.fromNamespaceAndPath("pandaclient", "lobby_snapshot");
    private static final Path FILE = FabricLoader.getInstance().getGameDir().resolve("pandaclient").resolve("lobby.png");
    private static long loadedAt = -1;
    private static int w, h;

    /** Called as the pause menu opens, while the last game frame is still on screen. */
    public static void capture(Minecraft mc) {
        if (mc.level == null) return;
        try {
            Screenshot.takeScreenshot(mc.getMainRenderTarget(), img -> {
                new Thread(() -> {
                    try (img) {
                        Files.createDirectories(FILE.getParent());
                        img.writeToFile(FILE);
                    } catch (Exception ignored) {}
                }, "PandaClient lobby snapshot").start();
            });
        } catch (Throwable ignored) {}
    }

    /** The snapshot's size {w, h}, loading or reloading it if the file changed; null when there's none. */
    public static int[] texture(Minecraft mc) {
        try {
            if (!Files.exists(FILE)) return null;
            long m = Files.getLastModifiedTime(FILE).toMillis();
            if (m != loadedAt) {
                try (InputStream in = Files.newInputStream(FILE)) {
                    NativeImage img = NativeImage.read(in);
                    w = img.getWidth(); h = img.getHeight();
                    mc.getTextureManager().register(ID, new DynamicTexture(() -> "PandaClient lobby", img));
                }
                loadedAt = m;
            }
            return w > 0 ? new int[]{w, h} : null;
        } catch (Throwable t) {
            return null;
        }
    }
}
