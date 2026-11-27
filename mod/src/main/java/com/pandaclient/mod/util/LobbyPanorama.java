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

    private static CubeMap cube;
    private static long loadedStamp = -1, lastCapture;
    private static boolean failed;

    private static Path dir() { return FabricLoader.getInstance().getGameDir().resolve("pandaclient"); }
    private static Path face(int i) { return dir().resolve("lobby_pano_" + i + ".png"); }

    /** Takes the six pictures around you. Called when the pause menu opens. */
    public static void capture(Minecraft mc) {
        if (mc.player == null || mc.level == null || System.currentTimeMillis() - lastCapture < 15_000) return;
        lastCapture = System.currentTimeMillis();
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
                Path out = face(i);
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

    /** Whether a captured panorama exists. */
    public static boolean available() {
        for (int i = 0; i < 6; i++) if (!Files.exists(face(i))) return false;
        return !failed;
    }

    /** Draws the panorama (pitch and yaw in degrees); false when there is none yet. */
    public static boolean render(Minecraft mc, float pitch, float yaw) {
        if (failed || !available()) return false;
        try {
            long stamp = 0;
            for (int i = 0; i < 6; i++) stamp = Math.max(stamp, Files.getLastModifiedTime(face(i)).toMillis());
            if (cube == null || stamp != loadedStamp) {
                if (System.currentTimeMillis() - stamp < 1500 && cube != null) { cube.render(mc, pitch, yaw); return true; }
                LobbyCubeTexture tex = new LobbyCubeTexture(ID);
                tex.apply(tex.loadContents(mc.getResourceManager()));
                mc.getTextureManager().register(ID, tex);
                if (cube == null) cube = new CubeMap(ID);
                loadedStamp = stamp;
            }
            cube.render(mc, pitch, yaw);
            return true;
        } catch (Throwable t) {
            failed = true;
            System.err.println("[PandaClient] Lobby panorama unavailable: " + t);
            return false;
        }
    }

    /** A cube map read from the captured pictures instead of a resource pack. */
    private static final class LobbyCubeTexture extends CubeMapTexture {
        LobbyCubeTexture(Identifier id) { super(id); }

        @Override
        public TextureContents loadContents(ResourceManager rm) throws IOException {
            NativeImage out = null;
            int w = 0, h = 0;
            for (int layer = 0; layer < 6; layer++) {
                try (InputStream in = Files.newInputStream(face(ORDER[layer])); NativeImage img = NativeImage.read(in)) {
                    if (out == null) { w = img.getWidth(); h = img.getHeight(); out = new NativeImage(w, h * 6, false); }
                    img.copyRect(out, 0, 0, 0, layer * h, w, h, false, true);
                }
            }
            return new TextureContents(out, new TextureMetadataSection(true, false, MipmapStrategy.MEAN, 0f));
        }
    }
}
