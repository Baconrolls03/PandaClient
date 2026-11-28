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
    private static Path stageFile(int slot) { return dir().resolve("lobby_scene_" + slot + ".stage"); }

    /**
     * Where you were standing in a captured place, seen from its camera: {@code dist} blocks straight ahead and
     * {@code drop} blocks below the camera. The lobby puts the characters there, on the blocks.
     */
    public record Stage(float dist, float drop) {}
    private static final Stage[] STAGES = new Stage[SLOTS];
    private static final long[] STAGE_STAMPS = new long[SLOTS];

    /** The standing spot of captured place {@code slot}, or null (older captures, or you were flying or swimming). */
    public static Stage stage(int slot) {
        if (slot >= SLOTS) {
            Minecraft mc = Minecraft.getInstance();
            String[] n = builtinNames(mc);
            int b = slot - SLOTS;
            if (b >= n.length) return null;
            return BUILTIN_STAGES.computeIfAbsent(b, k -> {
                try (var in = builtinFile(mc, n[k] + ".stage")) {
                    String[] v = new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).trim().split("\\s+");
                    return new Stage(Float.parseFloat(v[0]), Float.parseFloat(v[1]));
                } catch (Exception e) { return null; }
            });
        }
        if (slot < 0) return null;
        long st = stamp(slot);
        if (STAGE_STAMPS[slot] != st) {
            STAGE_STAMPS[slot] = st;
            STAGES[slot] = null;
            try {
                String[] v = Files.readString(stageFile(slot)).trim().split("\\s+");
                STAGES[slot] = new Stage(Float.parseFloat(v[0]), Float.parseFloat(v[1]));
            } catch (Exception ignored) {}
        }
        return STAGES[slot];
    }

    /** Vertical field of view of Minecraft's panorama (degrees). */
    private static final double FOV = 85;
    /** Which way the panorama turns for positive yaw and pitch (checked in CI with a marker block). */
    public static float yawSign = 1f, pitchSign = 1f;

    /**
     * Where a point {@code right}, {@code up} and {@code forward} blocks from a place's camera shows on screen
     * when the place is drawn at {@code pitch}/{@code yaw}: x and y from -1 to 1 (y down), or null if behind you.
     */
    public static float[] project(float right, float up, float forward, float pitch, float yaw, float aspect) {
        double ps = Math.toRadians(yaw * yawSign), th = Math.toRadians(pitch * pitchSign);
        double x1 = right * Math.cos(ps) - forward * Math.sin(ps);
        double z1 = right * Math.sin(ps) + forward * Math.cos(ps);
        double y2 = up * Math.cos(th) + z1 * Math.sin(th);
        double z2 = -up * Math.sin(th) + z1 * Math.cos(th);
        if (z2 < 0.05) return null;
        double t = Math.tan(Math.toRadians(FOV / 2));
        return new float[]{(float) (x1 / (z2 * t * aspect)), (float) (-y2 / (z2 * t))};
    }

    /** The pitch that puts the standing spot {@code screenY} (-1..1, down) on screen. */
    public static float pitchFor(Stage s, float screenY) {
        double feet = Math.atan2(s.drop(), s.dist());
        double want = Math.atan(screenY * Math.tan(Math.toRadians(FOV / 2)));
        return (float) Math.toDegrees(feet - want) * pitchSign;
    }

    /** How far behind you (blocks) the camera goes when it captures a place, when there's room. */
    private static final double BACK = 2.3, UP = 0.1;

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

    /** Lets the next pause capture straight away (CI). */
    public static void allowNow() { lastCapture = 0; }

    /** Takes the six pictures around you (called when the pause menu opens); the slot used, or -1. */
    public static int capture(Minecraft mc) {
        if (mc.player == null || mc.level == null || System.currentTimeMillis() - lastCapture < 45_000) return -1;
        lastCapture = System.currentTimeMillis();
        int slot = nextSlot();
        scenesCheckedAt = 0;
        LocalPlayer p = mc.player;
        Window win = mc.getWindow();
        RenderTarget target = mc.getMainRenderTarget();
        int ow = win.getWidth(), oh = win.getHeight();
        float xr = p.getXRot(), yr = p.getYRot(), xro = p.xRotO, yro = p.yRotO;
        double px = p.getX(), py = p.getY(), pz = p.getZ(), pxo = p.xo, pyo = p.yo, pzo = p.zo, pxOld = p.xOld, pyOld = p.yOld, pzOld = p.zOld;
        boolean moved = false;
        try {
            Files.createDirectories(dir());
            // Step the camera back (and a touch up) so the place where you stand is in front of it, on the
            // ground; stop short of walls. The lobby then puts your character on that spot.
            Files.deleteIfExists(stageFile(slot));
            if (p.onGround() && !p.isInWater() && !p.isPassenger()) {
                double fx = -Math.sin(Math.toRadians(yr)), fz = Math.cos(Math.toRadians(yr));
                net.minecraft.world.phys.Vec3 eye = p.getEyePosition();
                net.minecraft.world.phys.Vec3 to = eye.add(-fx * (BACK + 0.6), UP, -fz * (BACK + 0.6));
                var hit = mc.level.clip(new net.minecraft.world.level.ClipContext(eye, to,
                    net.minecraft.world.level.ClipContext.Block.VISUAL, net.minecraft.world.level.ClipContext.Fluid.NONE, p));
                double room = hit.getType() == net.minecraft.world.phys.HitResult.Type.MISS ? BACK + 0.6 : hit.getLocation().distanceTo(eye);
                double back = Math.min(BACK, room - 0.6);
                if (back >= 1.2) {
                    double up = UP * back / BACK;
                    p.setPos(px - fx * back, py + up, pz - fz * back);
                    p.xo = p.xOld = p.getX(); p.yo = p.yOld = p.getY(); p.zo = p.zOld = p.getZ();
                    moved = true;
                    Files.writeString(stageFile(slot), String.format(java.util.Locale.ROOT, "%.3f %.3f", back, p.getEyeHeight() + up));
                }
            }
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
                if (i == 0 && CiCheck.ON) System.out.println("[PandaClient CI] capture: player " + p.position() + " was " + px + "," + py + "," + pz
                    + " camera " + mc.gameRenderer.getMainCamera().position() + " yaw " + yr + " moved " + moved);
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
            if (moved) {
                p.setPos(px, py, pz);
                p.xo = pxo; p.yo = pyo; p.zo = pzo;
                p.xOld = pxOld; p.yOld = pyOld; p.zOld = pzOld;
            }
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
        return slot;
    }

    /** The picture files of a captured place (6 faces) and its standing spot file. */
    public static Path facePath(int slot, int i) { return face(slot, i); }
    public static Path stagePath(int slot) { return stageFile(slot); }

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

    // ---- built-in places (rendered by PandaClient's CI in a generated world, shipped in the mod)
    private static String[] builtinNames;
    private static final java.util.Map<Integer, CubeMap> BUILTIN_CUBES = new java.util.HashMap<>();
    private static final java.util.Map<Integer, Stage> BUILTIN_STAGES = new java.util.HashMap<>();

    private static String[] builtinNames(Minecraft mc) {
        if (builtinNames == null) {
            builtinNames = new String[0];
            try {
                var res = mc.getResourceManager().getResource(Identifier.fromNamespaceAndPath("pandaclient", "lobby/index.txt"));
                if (res.isPresent()) try (var in = res.get().open()) {
                    builtinNames = new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).lines().map(String::trim).filter(x -> !x.isEmpty()).toArray(String[]::new);
                }
            } catch (Exception e) {
                System.err.println("[PandaClient] Built-in lobby places unavailable: " + e);
            }
        }
        return builtinNames;
    }

    /** Built-in places, as scene numbers for {@link #render} and {@link #stage} (from {@link #SLOTS} up). */
    public static int[] builtins(Minecraft mc) {
        String[] n = builtinNames(mc);
        int[] out = new int[n.length];
        for (int i = 0; i < n.length; i++) out[i] = SLOTS + i;
        return out;
    }

    private static java.io.InputStream builtinFile(Minecraft mc, String file) throws IOException {
        var res = mc.getResourceManager().getResource(Identifier.fromNamespaceAndPath("pandaclient", "lobby/" + file));
        if (res.isEmpty()) throw new IOException("missing " + file);
        return res.get().open();
    }

    private static NativeImage readJpg(java.io.InputStream in) throws IOException {
        java.awt.image.BufferedImage b = javax.imageio.ImageIO.read(in);
        if (b == null) throw new IOException("not a picture");
        NativeImage img = new NativeImage(b.getWidth(), b.getHeight(), false);
        for (int y = 0; y < b.getHeight(); y++) for (int x = 0; x < b.getWidth(); x++) img.setPixel(x, y, 0xFF000000 | b.getRGB(x, y));
        return img;
    }

    /** The straight-ahead picture of the newest place you played (for the HUD editor), or null. */
    public static Path previewFace() {
        int[] sc = scenes();
        return sc.length == 0 ? null : face(sc[0], 0);
    }

    private static void clearDepth(Minecraft mc) {
        // over a world (the lobby opened in game), clear its depth so the panorama isn't hidden behind it
        if (mc.level == null) return;
        var depth = mc.getMainRenderTarget().getDepthTexture();
        if (depth != null) com.mojang.blaze3d.systems.RenderSystem.getDevice().createCommandEncoder().clearDepthTexture(depth, 1.0);
    }

    /** Draws captured place {@code slot} (pitch and yaw in degrees); false if it can't. */
    public static boolean render(Minecraft mc, int slot, float pitch, float yaw) {
        if (slot >= SLOTS) return renderBuiltin(mc, slot - SLOTS, pitch, yaw);
        if (failed || slot < 0) return false;
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

    private static boolean builtinFailed;

    private static boolean renderBuiltin(Minecraft mc, int b, float pitch, float yaw) {
        String[] n = builtinNames(mc);
        if (builtinFailed || b < 0 || b >= n.length) return false;
        try {
            CubeMap cube = BUILTIN_CUBES.get(b);
            if (cube == null) {
                Identifier id = Identifier.fromNamespaceAndPath("pandaclient", "lobby_place_" + b);
                String name = n[b];
                LobbyCubeTexture tex = new LobbyCubeTexture(id, i -> {
                    try (var in = builtinFile(mc, name + "_" + i + ".jpg")) { return readJpg(in); }
                });
                tex.apply(tex.loadContents(mc.getResourceManager()));
                mc.getTextureManager().register(id, tex);
                cube = new CubeMap(id);
                BUILTIN_CUBES.put(b, cube);
            }
            clearDepth(mc);
            cube.render(mc, pitch, yaw);
            return true;
        } catch (Throwable t) {
            builtinFailed = true;
            System.err.println("[PandaClient] Built-in lobby place unavailable: " + t);
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

    /** Reads picture i (0..5) of a place. */
    private interface Faces { NativeImage read(int i) throws IOException; }

    /** A cube map read from the captured (or built-in) pictures instead of a resource pack. */
    private static final class LobbyCubeTexture extends CubeMapTexture {
        private final Faces faces;
        LobbyCubeTexture(Identifier id, int slot) {
            this(id, i -> { try (InputStream in = Files.newInputStream(face(slot, i))) { return NativeImage.read(in); } });
        }
        LobbyCubeTexture(Identifier id, Faces faces) { super(id); this.faces = faces; }

        @Override
        public TextureContents loadContents(ResourceManager rm) throws IOException {
            NativeImage out = null;
            int w = 0, h = 0;
            for (int layer = 0; layer < 6; layer++) {
                try (NativeImage img = faces.read(ORDER[layer])) {
                    if (out == null) { w = img.getWidth(); h = img.getHeight(); out = new NativeImage(w, h * 6, false); }
                    img.copyRect(out, 0, 0, 0, layer * h, w, h, false, true);
                }
            }
            return new TextureContents(out, new TextureMetadataSection(true, false, MipmapStrategy.MEAN, 0f));
        }
    }
}
