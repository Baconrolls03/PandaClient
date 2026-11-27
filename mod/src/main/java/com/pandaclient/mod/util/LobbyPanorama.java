package com.pandaclient.mod.util;

import com.mojang.blaze3d.pipeline.RenderTarget;
import com.mojang.blaze3d.platform.NativeImage;
import com.mojang.blaze3d.platform.Window;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Screenshot;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.client.renderer.CubeMap;
import net.minecraft.client.renderer.PanoramicScreenshotParameters;
import net.minecraft.client.renderer.texture.CubeMapTexture;
import net.minecraft.client.renderer.texture.MipmapStrategy;
import net.minecraft.client.renderer.texture.TextureContents;
import net.minecraft.client.resources.metadata.texture.TextureMetadataSection;
import net.minecraft.resources.Identifier;
import net.minecraft.server.packs.resources.ResourceManager;
import org.joml.Vector3f;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

/**
 * The lobby's 3D backdrop: six pictures all around you, taken where you were standing when you last paused
 * (the same way Minecraft makes its title-screen panorama), shown as a 3D panorama that turns slowly and follows
 * the mouse.
 */
public final class LobbyPanorama {
    private LobbyPanorama() {}

    private static final Identifier ID = Identifier.fromNamespaceAndPath("pandaclient", "lobby_panorama");
    /** Cube map layer order (Minecraft's): which picture goes in each layer. */
    private static final int[] ORDER = {1, 3, 5, 4, 0, 2};
    private static final int SIZE = 512;

    /** How many places are remembered (the lobby cycles through them). */
    public static final int SLOTS = 6;
    private static final CubeMap[] CUBES = new CubeMap[SLOTS];
    private static final long[] STAMPS = new long[SLOTS];
    private static CubeMap vanilla;
    private static long lastCapture, scenesCheckedAt;
    private static int[] scenes = new int[0];
    private static boolean failed, vanillaFailed;

    private static Path dir() { return FabricLoader.getInstance().getGameDir().resolve("pandaclient"); }
    private static Path face(int slot, int i) { return dir().resolve("lobby_scene_" + slot + "_" + i + ".png"); }

    private static long stamp(int slot) {
        long st = 0;
        try { for (int i = 0; i < 6; i++) st = Math.max(st, Files.getLastModifiedTime(face(slot, i)).toMillis()); } catch (IOException e) { return -1; }
        return st;
    }

    /** The slot to capture into: an empty one, else the oldest. */
    private static int nextSlot() {
        int best = 0;
        long bestStamp = Long.MAX_VALUE;
        for (int s = 0; s < SLOTS; s++) {
            long st = stamp(s);
            if (st < 0) return s;
            if (st < bestStamp) { bestStamp = st; best = s; }
        }
        return best;
    }

    /** Takes the six pictures around you. Called when the pause menu opens. */
    public static void capture(Minecraft mc) {
        if (mc.player == null || mc.level == null || System.currentTimeMillis() - lastCapture < 45_000) return;
        lastCapture = System.currentTimeMillis();
        int slot = nextSlot();
        scenesCheckedAt = 0;
        LocalPlayer p = mc.player;
        Window win = mc.getWindow();
        RenderTarget target = mc.getMainRenderTarget();
        int ow = win.getWidth(), oh = win.getHeight();
        float xr = p.getXRot(), yr = p.getYRot(), xro = p.xRotO, yro = p.yRotO;
        try {
            Files.createDirectories(dir());
            mc.gameRenderer.setRenderBlockOutline(false);
            mc.gameRenderer.setPanoramicScreenshotParameters(new PanoramicScreenshotParameters(new Vector3f(mc.gameRenderer.getMainCamera().forwardVector())));
            win.setWidth(SIZE);
            win.setHeight(SIZE);
            target.resize(SIZE, SIZE);
            for (int i = 0; i < 6; i++) {
                switch (i) {
                    case 0 -> { p.setYRot(yr); p.setXRot(0); }
                    case 1 -> { p.setYRot((yr + 90) % 360); p.setXRot(0); }
                    case 2 -> { p.setYRot((yr + 180) % 360); p.setXRot(0); }
                    case 3 -> { p.setYRot((yr - 90) % 360); p.setXRot(0); }
                    case 4 -> { p.setYRot(yr); p.setXRot(-90); }
                    default -> { p.setYRot(yr); p.setXRot(90); }
                }
                p.yRotO = p.getYRot();
                p.xRotO = p.getXRot();
                mc.gameRenderer.updateCamera(DeltaTracker.ONE);
                mc.gameRenderer.renderLevel(DeltaTracker.ONE);
                Path out = face(slot, i);
                Screenshot.takeScreenshot(target, img -> {
                    try (img) {
                        Path tmp = out.resolveSibling(out.getFileName() + ".tmp");
                        img.writeToFile(tmp);
                        Files.move(tmp, out, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
                    } catch (Exception e) {
                        System.err.println("[PandaClient] Lobby panorama: couldn't save " + out.getFileName() + ": " + e);
                    }
                });
            }
        } catch (Throwable t) {
            System.err.println("[PandaClient] Lobby panorama capture failed: " + t);
        } finally {
            p.setXRot(xr);
            p.setYRot(yr);
            p.xRotO = xro;
            p.yRotO = yro;
            mc.gameRenderer.setRenderBlockOutline(true);
            win.setWidth(ow);
            win.setHeight(oh);
            target.resize(ow, oh);
            mc.gameRenderer.setPanoramicScreenshotParameters(null);
        }
    }

    /** Captured places (slot numbers), newest first. */
    public static int[] scenes() {
        if (failed) return new int[0];
        if (System.currentTimeMillis() - scenesCheckedAt < 3000) return scenes;
        scenesCheckedAt = System.currentTimeMillis();
        java.util.List<long[]> found = new java.util.ArrayList<>();
        for (int s = 0; s < SLOTS; s++) {
            long st = stamp(s);
            // skip a capture still being written
            if (st > 0 && System.currentTimeMillis() - st > 1500) found.add(new long[]{s, st});
        }
        found.sort((x, y) -> Long.compare(y[1], x[1]));
        scenes = found.stream().mapToInt(x -> (int) x[0]).toArray();
        return scenes;
    }

    public static boolean available() { return scenes().length > 0; }

    private static void clearDepth(Minecraft mc) {
        // over a world (the lobby opened in game), clear its depth so the panorama isn't hidden behind it
        if (mc.level == null) return;
        var depth = mc.getMainRenderTarget().getDepthTexture();
        if (depth != null) com.mojang.blaze3d.systems.RenderSystem.getDevice().createCommandEncoder().clearDepthTexture(depth, 1.0);
    }

    /** Draws captured place {@code slot} (pitch and yaw in degrees); false if it can't. */
    public static boolean render(Minecraft mc, int slot, float pitch, float yaw) {
        if (failed || slot < 0 || slot >= SLOTS) return false;
        try {
            long st = stamp(slot);
            if (st < 0) return false;
            if (CUBES[slot] == null || STAMPS[slot] != st) {
                Identifier id = Identifier.fromNamespaceAndPath("pandaclient", "lobby_scene_" + slot);
                LobbyCubeTexture tex = new LobbyCubeTexture(id, slot);
                tex.apply(tex.loadContents(mc.getResourceManager()));
                mc.getTextureManager().register(id, tex);
                if (CUBES[slot] == null) CUBES[slot] = new CubeMap(id);
                STAMPS[slot] = st;
            }
            clearDepth(mc);
            CUBES[slot].render(mc, pitch, yaw);
            return true;
        } catch (Throwable t) {
            failed = true;
            System.err.println("[PandaClient] Lobby panorama unavailable: " + t);
            return false;
        }
    }

    /** Minecraft's own title panorama at a chosen angle. */
    public static boolean renderVanilla(Minecraft mc, float pitch, float yaw) {
        if (vanillaFailed) return false;
        try {
            if (vanilla == null) vanilla = new CubeMap(Identifier.withDefaultNamespace("textures/gui/title/background/panorama"));
            clearDepth(mc);
            vanilla.render(mc, pitch, yaw);
            return true;
        } catch (Throwable t) {
            vanillaFailed = true;
            System.err.println("[PandaClient] Minecraft panorama unavailable: " + t);
            return false;
        }
    }

    /** A cube map read from the captured pictures instead of a resource pack. */
    private static final class LobbyCubeTexture extends CubeMapTexture {
        private final int slot;
        LobbyCubeTexture(Identifier id, int slot) { super(id); this.slot = slot; }

        @Override
        public TextureContents loadContents(ResourceManager rm) throws IOException {
            NativeImage out = null;
            int w = 0, h = 0;
            for (int layer = 0; layer < 6; layer++) {
                try (InputStream in = Files.newInputStream(face(slot, ORDER[layer])); NativeImage img = NativeImage.read(in)) {
                    if (out == null) { w = img.getWidth(); h = img.getHeight(); out = new NativeImage(w, h * 6, false); }
                    img.copyRect(out, 0, 0, 0, layer * h, w, h, false, true);
                }
            }
            return new TextureContents(out, new TextureMetadataSection(true, false, MipmapStrategy.MEAN, 0f));
        }
    }
}
