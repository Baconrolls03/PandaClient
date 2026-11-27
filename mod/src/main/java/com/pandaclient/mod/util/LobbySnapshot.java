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
                    try (img; NativeImage soft = blurred(img)) {
                        Files.createDirectories(FILE.getParent());
                        soft.writeToFile(FILE);
                    } catch (Exception ignored) {}
                }, "PandaClient lobby snapshot").start();
            });
        } catch (Throwable ignored) {}
    }

    /** A smaller, softly blurred copy (like a camera's depth of field), so the lobby reads as a backdrop. */
    static NativeImage blurred(NativeImage src) {
        int tw = 480, th = Math.max(1, src.getHeight() * tw / Math.max(1, src.getWidth()));
        int[] a = new int[tw * th], r = new int[tw * th], g = new int[tw * th], b = new int[tw * th];
        float sx = src.getWidth() / (float) tw, sy = src.getHeight() / (float) th;
        for (int y = 0; y < th; y++) for (int x = 0; x < tw; x++) {
            int ar = 0, rr = 0, gg = 0, bb = 0;
            for (int k = 0; k < 4; k++) {
                int px = Math.min(src.getWidth() - 1, (int) ((x + (k & 1) * 0.5f + 0.25f) * sx));
                int py = Math.min(src.getHeight() - 1, (int) ((y + (k >> 1) * 0.5f + 0.25f) * sy));
                int c = src.getPixel(px, py);
                ar += (c >>> 24) & 255; rr += (c >> 16) & 255; gg += (c >> 8) & 255; bb += c & 255;
            }
            int i = y * tw + x;
            a[i] = ar / 4; r[i] = rr / 4; g[i] = gg / 4; b[i] = bb / 4;
        }
        for (int pass = 0; pass < 3; pass++) for (int[] ch : new int[][]{r, g, b}) boxBlur(ch, tw, th, 2);
        NativeImage out = new NativeImage(tw, th, false);
        for (int y = 0; y < th; y++) for (int x = 0; x < tw; x++) {
            int i = y * tw + x;
            out.setPixel(x, y, (255 << 24) | (r[i] << 16) | (g[i] << 8) | b[i]);
        }
        return out;
    }

    private static void boxBlur(int[] c, int w, int h, int rad) {
        int[] t = new int[c.length];
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
            int sum = 0, n = 0;
            for (int k = -rad; k <= rad; k++) { int xx = x + k; if (xx >= 0 && xx < w) { sum += c[y * w + xx]; n++; } }
            t[y * w + x] = sum / n;
        }
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
            int sum = 0, n = 0;
            for (int k = -rad; k <= rad; k++) { int yy = y + k; if (yy >= 0 && yy < h) { sum += t[yy * w + x]; n++; } }
            c[y * w + x] = sum / n;
        }
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
