package com.pandaclient.mod.gui;

import com.pandaclient.mod.module.Modules;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.multiplayer.JoinMultiplayerScreen;
import net.minecraft.client.gui.screens.options.OptionsScreen;
import net.minecraft.client.gui.screens.worldselection.SelectWorldScreen;
import net.minecraft.client.input.CharacterEvent;
import net.minecraft.client.input.KeyEvent;
import net.minecraft.client.input.MouseButtonEvent;
import net.minecraft.client.renderer.RenderPipelines;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;

/**
 * PandaClient's main menu: a painted twilight bamboo valley (full-resolution artwork) that slowly
 * drifts and follows the mouse, drifting fireflies, the PandaClient logo and smooth glass buttons.
 */
public final class PandaTitleScreen extends Screen {
    private static final Identifier BG = Identifier.fromNamespaceAndPath("pandaclient", "textures/gui/title_background.png");
    private static final Identifier LOGO = Identifier.fromNamespaceAndPath("pandaclient", "textures/gui/title_logo.png");
    private static final int BG_W = 1920, BG_H = 1080, LOGO_W = 1024, LOGO_H = 393;
    private static final String[] LABELS = {"Singleplayer", "Multiplayer", "PandaClient Mods", "Options", "Quit"};

    private final long start = System.currentTimeMillis();
    private final float[] hover = new float[LABELS.length];
    private float mouseX = 0.5f, mouseY = 0.5f;

    public PandaTitleScreen() { super(Component.literal("PandaClient")); }

    /** Minecraft's own title screen, opened on purpose from the lobby (so Essential's buttons are there). */
    public static Screen vanillaTitle;
    private static Boolean essential;
    /** Whether Essential (social, invites, wardrobe) is installed. */
    static boolean essential() {
        if (essential == null) {
            boolean found = FabricLoader.getInstance().isModLoaded("essential") || FabricLoader.getInstance().isModLoaded("essential-container");
            if (!found) try { Class.forName("gg.essential.api.EssentialAPI", false, PandaTitleScreen.class.getClassLoader()); found = true; } catch (Throwable ignored) {}
            essential = found;
        }
        return essential;
    }

    /** Canvas box of the Essential button in the top bar: x1, y1, x2, y2 (null when Essential isn't installed). */
    private float[] essentialBox() {
        if (!essential()) return null;
        float right = vw - 130 - tw(name(), 13, true) - 16, w = tw("Essential", 12, true) + 34;
        return new float[]{right - w, 12, right, 38};
    }

    @Override public boolean shouldCloseOnEsc() { return false; }

    @Override protected void init() {}

    @Override public boolean isPauseScreen() { return false; }

    private float t() { return (System.currentTimeMillis() - start) / 1000f; }
    /** Length of each cinematic shot and of the dip to black between shots (seconds). */
    private static final float SHOT = 11f, CUT = 0.9f;

    /**
     * A shader-like grade over the 3D background: warm golden light from above, cooler shadows below, a soft
     * sun glow with light rays (its place changes every shot) and a vignette.
     */
    private void grade(GuiGraphics g, Draw d, float t, int shot) {
        int w = width, h = height;
        g.fillGradient(0, 0, w, h / 2, 0x2EFF9E48, 0x00FF9E48);
        g.fillGradient(0, h / 2, w, h, 0x00081830, 0x3A061226);
        float sx = w * (0.18f + 0.64f * hash(shot, 7)) + (mouseX - 0.5f) * w * 0.03f, sy = -h * 0.04f;
        // light rays, slowly breathing
        g.pose().pushMatrix();
        g.pose().translate(sx, sy);
        for (int i = 0; i < 7; i++) {
            float a = 0.35f + i * 0.36f + 0.04f * (float) Math.sin(t * 0.35f + i * 1.7f);
            int len = Math.round(h * 1.3f), wd = Math.round(h * (0.035f + 0.05f * hash(i, shot + 3)));
            int alpha = Math.round(20 + 12 * (float) Math.sin(t * 0.5f + i * 2.1f));
            g.pose().pushMatrix();
            g.pose().rotate(a);
            g.fillGradient(-wd / 2, 0, wd / 2, len, Draw.alpha(0xFFFFE4B5, Math.max(0, alpha)), 0x00FFE4B5);
            g.pose().popMatrix();
        }
        g.pose().popMatrix();
        // sun glow (bloom) and vignette: smooth gradient pictures, stretched
        float r = h * 0.55f;
        blitSoft(g, glow(), sx - r, sy - r, 2 * r, 2 * r, 0x66FFD69A);
        blitSoft(g, vignette(), 0, 0, w, h, 0xFF000000);
    }

    private static net.minecraft.resources.Identifier glowTex, vignetteTex;

    /** A white picture whose alpha falls off with distance from the centre (r = 0 centre, 1 edge, ~1.41 corners). */
    private static net.minecraft.resources.Identifier soft(String name, int w, int h, java.util.function.DoubleUnaryOperator alpha) {
        var ni = new com.mojang.blaze3d.platform.NativeImage(w, h, false);
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
            double dx = (x + 0.5) / (w / 2.0) - 1, dy = (y + 0.5) / (h / 2.0) - 1;
            int a = (int) Math.round(255 * Math.max(0, Math.min(1, alpha.applyAsDouble(Math.sqrt(dx * dx + dy * dy)))));
            ni.setPixel(x, y, (a << 24) | 0xFFFFFF);
        }
        var id = net.minecraft.resources.Identifier.fromNamespaceAndPath("pandaclient", "fx/" + name);
        net.minecraft.client.Minecraft.getInstance().getTextureManager().register(id, new net.minecraft.client.renderer.texture.DynamicTexture(() -> "PandaClient " + name, ni));
        return id;
    }

    private static net.minecraft.resources.Identifier glow() {
        if (glowTex == null) glowTex = soft("glow", 256, 256, r -> r >= 1 ? 0 : Math.pow(1 - r, 2.4));
        return glowTex;
    }

    private static net.minecraft.resources.Identifier vignette() {
        if (vignetteTex == null) vignetteTex = soft("vignette", 256, 144, r -> 0.62 * Math.pow(Math.max(0, (r - 0.6) / 0.81), 1.5));
        return vignetteTex;
    }

    private static void blitSoft(GuiGraphics g, net.minecraft.resources.Identifier tex, float x, float y, float w, float h, int argb) {
        int tw = tex == vignetteTex ? 256 : 256, th = tex == vignetteTex ? 144 : 256;
        g.pose().pushMatrix();
        g.pose().translate(x, y);
        g.pose().scale(w / tw, h / th);
        g.blit(RenderPipelines.GUI_TEXTURED, tex, 0, 0, 0f, 0f, tw, th, tw, th, argb);
        g.pose().popMatrix();
    }

    private static float hash(int a, int b) {
        int h = a * 374761393 + b * 668265263;
        h = (h ^ (h >>> 13)) * 1274126177;
        return ((h ^ (h >>> 16)) & 0xFFFFFF) / (float) 0xFFFFFF;
    }

    @Override
    public void renderBackground(GuiGraphics g, int mx, int my, float delta) {
        Draw d = new Draw(g);
        float t = t();
        // smooth the parallax so it glides after the mouse
        mouseX += ((mx / (float) Math.max(1, width)) - mouseX) * 0.06f;
        mouseY += ((my / (float) Math.max(1, height)) - mouseY) * 0.06f;

        if (card()) {
            // A real 3D world behind you: the place you last paused in (six pictures all around, like Minecraft's
            // own title panorama), slowly turning and following the mouse; Minecraft's panorama until then.
            // Cinematic: a series of slow camera moves, cutting between places and angles, with a dip to black
            // between shots. The places: ones you've played (newest first), then PandaClient's built-in places; Minecraft's own panorama
            // only when there are none of either
            int[] played = Modules.TITLE_SCREEN.lobbyFromWorld.on() ? com.pandaclient.mod.util.LobbyPanorama.scenes() : new int[0];
            int[] builtin = com.pandaclient.mod.util.LobbyPanorama.builtins(minecraft);
            int[] scenes = new int[played.length + builtin.length];
            System.arraycopy(played, 0, scenes, 0, played.length);
            System.arraycopy(builtin, 0, scenes, played.length, builtin.length);
            int count = scenes.length == 0 ? 1 : scenes.length;
            int shot = (int) (t / SHOT);
            float local = t - shot * SHOT, p = local / SHOT, ease = p * p * (3 - 2 * p);
            int scene = shot % count;
            float startYaw = (shot * 137.5f + 20) % 360, sweep = (shot % 2 == 0 ? 1 : -1) * 32;
            float yaw = startYaw + sweep * ease + (mouseX - 0.5f) * 12f;
            float pitch = 8f + 5f * (float) Math.sin(shot * 1.7f) + (ease - 0.5f) * 5f + (mouseY - 0.5f) * 6f;
            // A place where you were standing on the ground: look at that spot, so everyone stands on its blocks,
            // with a slow sideways drift (the characters move with the ground).
            var st = scene < scenes.length ? com.pandaclient.mod.util.LobbyPanorama.stage(scenes[scene]) : null;
            if (st != null) {
                yaw = (shot % 2 == 0 ? 1 : -1) * 16f * (ease - 0.5f) + (mouseX - 0.5f) * 6f;
                pitch = com.pandaclient.mod.util.LobbyPanorama.pitchFor(st, 0.78f) + (mouseY - 0.5f) * 3f;
                // CI: turned well to one side, so a wrong turning direction would show as a big miss
                if (com.pandaclient.mod.util.CiCheck.ON) { yaw = -15f; pitch = com.pandaclient.mod.util.LobbyPanorama.pitchFor(st, 0.78f); }
            }
            stage = st; stageYaw = yaw; stagePitch = pitch;
            boolean own = scene < scenes.length
                ? com.pandaclient.mod.util.LobbyPanorama.render(minecraft, scenes[scene], pitch, yaw)
                : com.pandaclient.mod.util.LobbyPanorama.renderVanilla(minecraft, pitch, yaw);
            if (!own) renderPanorama(g, delta);
            renderBlurredBackground(g);
            if (Modules.TITLE_SCREEN.cinematic.on()) grade(g, d, t, shot);
            // dip to black between shots
            if (shot > 0 || local > SHOT - CUT) {
                float dip = local < CUT ? 1 - local / CUT : local > SHOT - CUT ? (local - (SHOT - CUT)) / CUT : 0;
                if (dip > 0) d.rect(0, 0, width, height, Draw.alpha(0xFF000000, Math.round(255 * dip * dip * (3 - 2 * dip))));
            }
            drawShadow(g);
            float fadeIn = Math.min(1f, t / 0.8f);
            if (fadeIn < 1) d.rect(0, 0, width, height, Draw.alpha(0xFF000000, (int) ((1 - fadeIn) * 255)));
            return;
        }
        // artwork: cover the screen, slow "breathing" zoom, parallax towards the mouse
        // Where you left off (snapshot from your last world or server), else the painted valley.
        int[] snap = Modules.TITLE_SCREEN.lobbyFromWorld.on() ? com.pandaclient.mod.util.LobbySnapshot.texture(minecraft) : null;
        Identifier bgTex = snap != null ? com.pandaclient.mod.util.LobbySnapshot.ID : BG;
        int BG_W = snap != null ? snap[0] : PandaTitleScreen.BG_W, BG_H = snap != null ? snap[1] : PandaTitleScreen.BG_H;
        float cover = Math.max(width / (float) BG_W, height / (float) BG_H);
        float zoom = 1.06f + 0.015f * (float) Math.sin(t * 0.12f);
        float s = cover * zoom;
        float dw = BG_W * s, dh = BG_H * s;
        float ox = (width - dw) / 2f - (mouseX - 0.5f) * width * 0.04f;
        float oy = (height - dh) / 2f - (mouseY - 0.5f) * height * 0.03f;
        g.pose().pushMatrix();
        g.pose().translate(ox, oy);
        g.pose().scale(s, s);
        g.blit(RenderPipelines.GUI_TEXTURED, bgTex, 0, 0, 0f, 0f, BG_W, BG_H, BG_W, BG_H);
        g.pose().popMatrix();

        if (snap != null && card()) {
            d.rect(0, 0, width, height, 0x260B0F16);
            drawShadow(g);
            float fadeIn = Math.min(1f, t / 0.8f);
            if (fadeIn < 1) d.rect(0, 0, width, height, Draw.alpha(0xFF000000, (int) ((1 - fadeIn) * 255)));
            return;
        }
        // soft vignette: darker top and bottom so the logo and buttons read clearly
        int bands = card() ? 0 : 24;
        for (int i = 0; i < bands; i++) {
            float f = 1 - i / (float) bands;
            int a = (int) (f * f * 150);
            int h1 = height * i / (bands * 4), h2 = height * (i + 1) / (bands * 4);
            d.rect(0, h1, width, h2 + 1, Draw.alpha(0xFF070A12, a));
            d.rect(0, height - h2 - 1, width, height - h1, Draw.alpha(0xFF070A12, (int) (a * 1.3f)));
        }
        if (!card()) d.rect(0, 0, width, height, 0x22070A12);

        // fireflies drifting over the art
        if (Modules.TITLE_SCREEN.fireflies.on()) {
            for (int i = 0; i < 26; i++) {
                float px = (hash(i, 5) * width + t * (6 + hash(i, 7) * 10) + (float) Math.sin(t * 0.5f + i) * 18) % (width + 20) - 10;
                float py = height * (0.35f + hash(i, 6) * 0.6f) + (float) Math.cos(t * 0.7f + i * 2) * 10 - (mouseY - 0.5f) * 8;
                float pulse = 0.5f + 0.5f * (float) Math.sin(t * (1.5f + hash(i, 8)) + i);
                int a = (int) (70 + 185 * pulse);
                int x = (int) px, y = (int) py;
                d.rect(x - 2, y - 2, x + 3, y + 3, Draw.alpha(0xFFE9FF9A, a / 8));
                d.rect(x - 1, y - 1, x + 2, y + 2, Draw.alpha(0xFFE9FF9A, a / 3));
                d.rect(x, y, x + 1, y + 1, Draw.alpha(0xFFFFFFE0, a));
            }
        }

        if (card()) drawShadow(g);
        // fade in from black when the menu opens
        float fade = Math.min(1f, t / 0.8f);
        if (fade < 1) d.rect(0, 0, width, height, Draw.alpha(0xFF000000, (int) ((1 - fade) * 255)));
    }

    private boolean card() { return Modules.TITLE_SCREEN.serverCard.on() && width >= 360; }
    private int bw() { return card() ? Math.min(170, width / 2 - 40) : Math.min(210, width - 40); }
    private int bx() { return card() ? Math.max(16, width / 14) : width / 2 - bw() / 2; }
    private int top() { return Math.max(height / 2 - 6, logoH() + 20); }
    private int logoW() { return Math.min(card() ? bw() + 40 : width - 40, Math.min(330, (int) (width * 0.42f))); }
    private int logoH() { return Math.round(logoW() * LOGO_H / (float) LOGO_W); }

    /** x, y, w, h of button i. */
    private int[] box(int i) {
        int y = top() + i * 24;
        if (i < 3) return new int[]{bx(), y, bw(), 20};
        int half = (bw() - 4) / 2;
        return new int[]{i == 3 ? bx() : bx() + half + 4, top() + 3 * 24 + 4, half, 20};
    }

    @Override
    public void render(GuiGraphics g, int mx, int my, float delta) {
        super.render(g, mx, my, delta);
        Draw d = new Draw(g);
        float t = t();
        float in = Math.min(1f, Math.max(0f, (t - 0.2f) / 0.6f));
        float ease = 1 - (1 - in) * (1 - in) * (1 - in);

        if (!card()) {
        // logo, floating gently
        int lw = logoW(), lh = logoH();
        float ly = top() - lh - 14 + (float) Math.sin(t * 1.2f) * 2.5f - (1 - ease) * 12;
        g.pose().pushMatrix();
        g.pose().translate(card() ? bx() - 6 : width / 2f - lw / 2f, ly);
        float k = lw / (float) LOGO_W;
        g.pose().scale(k, k);
        g.blit(RenderPipelines.GUI_TEXTURED, LOGO, 0, 0, 0f, 0f, LOGO_W, LOGO_H, LOGO_W, LOGO_H);
        g.pose().popMatrix();

        // buttons: frosted glass, mint accent and a soft glow on hover; they slide in one after another
        for (int i = 0; i < LABELS.length; i++) {
            int[] b = box(i);
            float appear = Math.min(1f, Math.max(0f, (t - 0.35f - i * 0.07f) / 0.35f));
            if (appear <= 0) continue;
            float ap = 1 - (1 - appear) * (1 - appear);
            int x0 = b[0], y0 = b[1] + Math.round((1 - ap) * 10), w = b[2], h = b[3];
            boolean hov = appear >= 1 && Widgets.in(mx, my, x0, y0, w, h);
            hover[i] += ((hov ? 1 : 0) - hover[i]) * 0.2f;
            float hv = hover[i];
            int alphaMul = (int) (255 * ap);
            if (hv > 0.02f) d.round(x0 - 2, y0 - 2, x0 + w + 2, y0 + h + 2, Draw.alpha(Theme.accent(), (int) (60 * hv * ap)));
            d.round(x0, y0, x0 + w, y0 + h, Draw.alpha(Draw.lerpColor(0xFF0E1420, 0xFF1A2433, hv), (int) ((150 + 70 * hv) * ap)));
            d.rect(x0 + 1, y0, x0 + w - 1, y0 + 1, Draw.alpha(0xFFFFFFFF, (int) ((22 + 30 * hv) * ap)));
            int bar = Math.round(2 + hv * (w - 4));
            if (i == 2 || hv > 0.02f) d.rect(x0 + 1, y0 + h - 2, x0 + 1 + (i == 2 ? Math.max(bar, 24) : bar), y0 + h - 1, Draw.alpha(Theme.accent(), alphaMul));
            int tc = Draw.alpha(Draw.lerpColor(0xFFDCE4EE, 0xFFFFFFFF, hv), alphaMul);
            d.centered(LABELS[i], x0 + w / 2, y0 + 6, tc, true);
        }

        }
        if (card()) { drawBodies(g, mx, my); ciMarkers(g); lobby(g, mx, my, ease); return; }
        // footer
        int mods = FabricLoader.getInstance().getAllMods().size();
        int fa = (int) (170 * ease);
        d.text("Minecraft " + FabricLoader.getInstance().getModContainer("minecraft").map(c -> c.getMetadata().getVersion().getFriendlyString()).orElse("") + "  ·  " + mods + " mods", 6, height - 12, Draw.alpha(0xFFFFFFFF, fa), true);
        String who = minecraft.getUser() != null ? "Signed in as " + minecraft.getUser().getName() : "PandaClient";
        d.text(who, width - Draw.textWidth(who) - 6, height - 12, Draw.alpha(0xFFFFFFFF, fa), true);
    }

    // ================================================================ OneClient-style lobby
    // Everything below is laid out on a 720-unit-tall canvas (OneClient's own proportions), scaled to
    // the window, so it looks the same at every GUI scale.

    private static final Identifier PANDA = Identifier.fromNamespaceAndPath("pandaclient", "textures/gui/panda_logo.png");
    private static final String[] TABS = {"Play", "Mods", "Options"};
    private static final int CARD_FILL = 0x9E0E1117, CARD_LINE = 0x24FFFFFF, MUTED = 0xFFA3AAB6, DIM = 0xFF7D8592;
    /** Where the middle of a line of text sits below its top, as a share of the font size. */
    private static final float MID = 0.52f;

    private float k = 1f;           // GUI pixels per canvas unit
    private float vw = 1280, vh = 720;
    private Draw d;
    private float a = 1f;            // fade-in

    private void zoom() {
        k = height / 720f;
        vw = width / k;
        vh = 720f;
    }

    private int col(int argb) { return Draw.alpha(argb, Math.round((argb >>> 24) * a)); }

    private void txt(String s, float x, float cy, float size, int argb, boolean bold) {
        d.textScaled(s, x, cy - size * MID, size / 8f, col(argb), bold);
    }
    private float tw(String s, float size, boolean bold) { return Draw.widthF(s, bold) * size / 8f; }
    private void txtR(String s, float right, float cy, float size, int argb, boolean bold) { txt(s, right - tw(s, size, bold), cy, size, argb, bold); }
    private void txtC(String s, float cx, float cy, float size, int argb, boolean bold) { txt(s, cx - tw(s, size, bold) / 2, cy, size, argb, bold); }

    private void card(float x1, float y1, float x2, float y2, float r) { d.rounded(x1, y1, x2, y2, r, col(CARD_FILL), col(CARD_LINE)); }

    private static boolean in(double mx, double my, float x1, float y1, float x2, float y2) { return mx >= x1 && my >= y1 && mx < x2 && my < y2; }

    private String name() { return minecraft.getUser() != null ? minecraft.getUser().getName() : "Player"; }
    private static String mcVersion() {
        return FabricLoader.getInstance().getModContainer("minecraft").map(c -> c.getMetadata().getVersion().getFriendlyString()).orElse("");
    }

    private void lobby(GuiGraphics g, int mouseX, int mouseY, float ease) {
        zoom();
        a = ease;
        d = new Draw(g);
        double mx = mouseX / k, my = mouseY / k;
        d.push();
        d.scale(k);
        d.zoom = k;
        drawNametag();
        drawTopBar(mx, my);
        drawLeft(mx, my);
        drawServerCard(mx, my);
        drawFooter();
        drawInviteMenu(mx, my);
        drawBanner();
        d.pop();
    }

    // ---------------------------------------------------------------- your character

    /** Canvas box of the character: x, y, w, h. */
    private float[] playerBox() {
        float ph = 370, pw = ph * 0.55f;
        float feet = vh * 0.9f;
        return new float[]{vw * 0.5f - pw / 2, feet - ph, pw, ph};
    }

    /** Where party member i stands: canvas x offset from you and how much smaller (further back) they are. */
    private static final float[] MATE_DX = {-170, 170, -300, 300}, MATE_SCALE = {0.88f, 0.88f, 0.74f, 0.74f};

    private java.util.List<com.pandaclient.mod.util.Party.Member> mateList() {
        var others = com.pandaclient.mod.util.Party.others(name());
        return others.size() > MATE_DX.length ? others.subList(0, MATE_DX.length) : others;
    }

    /** The place on screen now, when the characters stand on its blocks (null: they stand in front of it). */
    private com.pandaclient.mod.util.LobbyPanorama.Stage stage;
    private float stageYaw, stagePitch;
    /** Where you and party members stand on the blocks: blocks to the right of and behind your spot. */
    private static final float[][] STAND = {{0, 0}, {-1.25f, 0.45f}, {1.25f, 0.45f}, {-2.3f, 1.2f}, {2.3f, 1.2f}};

    /** Canvas point of a spot {@code right}/{@code back} blocks from where you stood, {@code up} blocks above the ground. */
    private float[] onStage(float right, float back, float up) {
        var q = com.pandaclient.mod.util.LobbyPanorama.project(right, up - stage.drop(), stage.dist() + back, stagePitch, stageYaw, vw / vh);
        return q == null ? null : new float[]{vw / 2 + q[0] * vw / 2, vh / 2 + q[1] * vh / 2};
    }

    /** Home x, feet y and height of character i (0 = you) standing on the blocks, or null. */
    private float[] standing(int i) {
        if (stage == null || i >= STAND.length) return null;
        float[] f = onStage(STAND[i][0], STAND[i][1], 0), h = onStage(STAND[i][0], STAND[i][1], 1.8f);
        if (f == null || h == null || f[1] - h[1] < 40) return null;
        float height = Math.min(560, (f[1] - h[1]) / 0.913f);
        return new float[]{f[0], f[1] + 0.0435f * height, height};
    }

    private float[] mateBox(int i) {
        float[] b = playerBox();
        float h = b[3] * MATE_SCALE[i], w = h * 0.55f;
        float cx = b[0] + b[2] / 2 + MATE_DX[i], feet = b[1] + b[3] - (i < 2 ? 14 : 30);
        return new float[]{cx - w / 2, feet - h, w, h};
    }

    // ---------------------------------------------------------------- characters you can pick up and throw

    /** One character standing in the lobby, with simple physics (canvas units, y down). */
    private static final class Body {
        final String key; final java.util.UUID id; final String name; final boolean leader, online;
        float homeX, feet, height;
        float dx, dy, vx, vy;          // offset from home and speed
        float ang, angV;               // swing: feet to the right is positive
        float held, walk, face;        // 0..1 amounts, facing (degrees)
        boolean grabbed, grounded = true;
        float lastAx, lastVx;
        Body(String key, java.util.UUID id, String name, boolean leader, boolean online) { this.key = key; this.id = id; this.name = name; this.leader = leader; this.online = online; }
        float cx() { return homeX + dx; }
        float cy() { return feet - height / 2 + dy; }
        float neckX() { return cx(); }
        float neckY() { return cy() - height * 0.228f; }
    }

    private final java.util.Map<String, Body> bodies = new java.util.LinkedHashMap<>();
    private Body grabbed;
    private long lastPhysics;
    private float mouseCX, mouseCY;
    private boolean ciFrozen;
    private static final float G = 2600;

    /** Everyone standing in the lobby: you, then your party. */
    private java.util.List<Body> bodies() {
        java.util.List<Body> out = new java.util.ArrayList<>();
        if (!Modules.TITLE_SCREEN.lobbyPlayer.on()) return out;
        float[] b = playerBox();
        Body you = bodies.computeIfAbsent("you", k -> new Body("you", null, name(), true, true));
        you.homeX = b[0] + b[2] / 2; you.feet = b[1] + b[3]; you.height = b[3];
        float[] on = standing(0);
        if (on != null) { you.homeX = on[0]; you.feet = on[1]; you.height = on[2]; }
        out.add(you);
        var list = mateList();
        for (int i = 0; i < list.size(); i++) {
            var m = list.get(i);
            float[] mb = mateBox(i);
            Body body = bodies.computeIfAbsent(m.uuid().toString(), k -> new Body(k, m.uuid(), m.name(), m.leader(), m.online()));
            body.homeX = mb[0] + mb[2] / 2; body.feet = mb[1] + mb[3]; body.height = mb[3];
            float[] mon = standing(i + 1);
            if (mon != null) { body.homeX = mon[0]; body.feet = mon[1]; body.height = mon[2]; }
            out.add(body);
        }
        return out;
    }

    private void physics() {
        long now = System.currentTimeMillis();
        float dt = lastPhysics == 0 ? 0 : Math.min(1f / 30, (now - lastPhysics) / 1000f);
        lastPhysics = now;
        if (dt <= 0 || ciFrozen) return;
        for (Body b : bodies()) {
            if (b == grabbed) {
                // the neck follows the cursor; the body hangs and swings like a pendulum
                float tx = mouseCX, ty = mouseCY;
                float nx = b.neckX() + (tx - b.neckX()) * (1 - (float) Math.exp(-dt * 26));
                float ny = b.neckY() + (ty - b.neckY()) * (1 - (float) Math.exp(-dt * 26));
                float nvx = (nx - b.neckX()) / dt, nvy = (ny - b.neckY()) / dt;
                float ax = (nvx - b.vx) / dt;
                b.lastAx = b.lastAx * 0.6f + ax * 0.4f;
                b.vx = nvx; b.vy = nvy;
                b.dx = nx - b.homeX;
                b.dy = ny + b.height * 0.228f - (b.feet - b.height / 2);
                float len = b.height * 0.55f;
                float alpha = -(G / len) * (float) Math.sin(b.ang) - (b.lastAx / len) * (float) Math.cos(b.ang) - 3.2f * b.angV;
                b.angV += alpha * dt;
                b.ang = Math.max(-1.4f, Math.min(1.4f, b.ang + b.angV * dt));
                b.held += (1 - b.held) * Math.min(1, dt * 10);
                b.walk += (0 - b.walk) * Math.min(1, dt * 8);
                b.grounded = false;
            } else {
                b.held += (0 - b.held) * Math.min(1, dt * 6);
                if (!b.grounded) {
                    b.vy += G * dt;
                    b.dx += b.vx * dt;
                    b.dy += b.vy * dt;
                    b.angV *= (float) Math.exp(-dt * 1.2f);
                    b.ang += b.angV * dt;
                    if (b.dy >= 0) {
                        b.dy = 0;
                        if (b.vy > 340) { b.vy = -b.vy * 0.33f; b.vx *= 0.7f; b.angV += b.vx * 0.004f; }
                        else { b.vy = 0; b.grounded = true; }
                    }
                } else {
                    // back on the ground: straighten up, then walk home
                    b.angV += (-b.ang * 70 - b.angV * 10) * dt;
                    b.ang += b.angV * dt;
                    b.vx *= (float) Math.exp(-dt * 8);
                    b.dx += b.vx * dt;
                    if (Math.abs(b.dx) > 4 && Math.abs(b.ang) < 0.25f) {
                        float walkV = Math.max(-150, Math.min(150, -b.dx * 2.4f));
                        b.dx += walkV * dt;
                        b.walk += (1 - b.walk) * Math.min(1, dt * 8);
                        b.face += ((walkV > 0 ? 70 : -70) - b.face) * Math.min(1, dt * 8);
                    } else {
                        b.walk += (0 - b.walk) * Math.min(1, dt * 6);
                        b.face += (0 - b.face) * Math.min(1, dt * 5);
                    }
                }
            }
            // stay on screen
            float minX = 40 - b.homeX, maxX = vw - 40 - b.homeX;
            if (b.dx < minX) { b.dx = minX; b.vx = Math.abs(b.vx) * 0.4f; }
            if (b.dx > maxX) { b.dx = maxX; b.vx = -Math.abs(b.vx) * 0.4f; }
            b.dy = Math.max(b.dy, -(b.feet - b.height - 40));
        }
    }

    private Body bodyAt(double mx, double my) {
        java.util.List<Body> list = bodies();
        for (int i = list.size() - 1; i >= 0; i--) {
            Body b = list.get(i);
            float hw = b.height * 0.26f;
            if (mx >= b.cx() - hw && mx <= b.cx() + hw && my >= b.cy() - b.height / 2 && my <= b.cy() + b.height / 2) return b;
        }
        return null;
    }

    @Override
    public boolean mouseDragged(MouseButtonEvent e, double dx, double dy) {
        if (grabbed != null) { mouseCX = (float) (e.x() / k); mouseCY = (float) (e.y() / k); return true; }
        return super.mouseDragged(e, dx, dy);
    }

    @Override
    public boolean mouseReleased(MouseButtonEvent e) {
        if (grabbed != null) {
            grabbed.vx = Math.max(-1800, Math.min(1800, grabbed.vx));
            grabbed.vy = Math.max(-2200, Math.min(1800, grabbed.vy));
            grabbed.grounded = false;
            grabbed = null;
            return true;
        }
        return super.mouseReleased(e);
    }

    /** CI: the party card with the invite list open and a message being typed. */
    public void ciParty() { inviteOpen = true; chatFocused = true; chatDraft = "on my way!"; }

    /** CI: freeze you in mid-air, swinging, so the screenshot shows the held pose. */
    public void ciPose() {
        zoom();
        for (Body b : bodies()) if (b.id == null) { b.dy = -150; b.ang = 0.55f; b.held = 1; b.grounded = false; }
        ciFrozen = true;
    }

    /** Draws everyone (before the cards and nametags). */
    private void drawBodies(GuiGraphics g, int mouseX, int mouseY) {
        if (!card() || t() < 0.4f) return;
        zoom();
        mouseCX = grabbed != null ? mouseCX : mouseX / k;
        mouseCY = grabbed != null ? mouseCY : mouseY / k;
        physics();
        float time = t();
        java.util.List<Body> order = new java.util.ArrayList<>(bodies());
        java.util.Collections.reverse(order);
        for (Body b : order) {
            float box = b.height * 1.7f;
            int x0 = Math.round((b.cx() - box / 2) * k), y0 = Math.round((b.cy() - b.height * 1.25f) * k);
            int x1 = Math.round((b.cx() + box / 2) * k), y1 = Math.round((b.cy() + b.height * 0.53f) * k);
            // turn the head (and a little of the body) towards the cursor
            float look = Math.max(-0.6f, Math.min(0.6f, -(mouseX / k - b.cx()) / vw * 1.8f));
            float pitch = Math.max(-0.45f, Math.min(0.5f, (mouseY / k - (b.cy() - b.height * 0.4f)) / vh * 1.4f));
            float yaw = b.face - 12 - (mouseX / k / vw - 0.5f) * 16;
            LobbyPlayer.draw(minecraft, g, b.key, b.id, b.name, x0, y0, x1, y1, b.height * k, yaw,
                new LobbyPlayer.Pose(b.ang, b.held, b.walk, time + b.key.hashCode() % 7, b.held > 0.5f ? 0 : look, b.held > 0.5f ? 0.25f : pitch));
        }
    }

    /** CI: crosses where the test world's gold pillar (3 ahead, 2 right of where you stood) and the standing spot should show. */
    private void ciMarkers(GuiGraphics g) {
        if (!com.pandaclient.mod.util.CiCheck.ON || stage == null) return;
        Draw md = new Draw(g);
        float[][] pts = {onStage(2f, 3f - stage.dist(), 1.5f), onStage(0, 0, 0)};
        int[] cols = {0xFFFF0000, 0xFF00FF00};
        for (int i = 0; i < pts.length; i++) {
            if (pts[i] == null) continue;
            int x = Math.round(pts[i][0] * k), y = Math.round(pts[i][1] * k);
            md.rect(x - 8, y - 1, x + 8, y + 1, cols[i]);
            md.rect(x - 1, y - 8, x + 1, y + 8, cols[i]);
        }
    }

    /** Soft shadows under everyone's feet (drawn before the characters). */
    private void drawShadow(GuiGraphics g) {
        if (!Modules.TITLE_SCREEN.lobbyPlayer.on()) return;
        zoom();
        Draw sd = new Draw(g);
        sd.push(); sd.scale(k); sd.zoom = k;
        for (Body b : bodies()) {
            float cx = b.cx(), cy = b.feet - b.height * 0.044f - 2;
            float sh = 1f / (1f - b.dy / 260f);
            float size = b.height / 190f;
            for (int i = 0; i < 5; i++) {
                float rx = (34 - i * 5) * sh * size, ry = (8 - i * 1.2f) * sh * size;
                sd.rounded(cx - rx, cy - ry, cx + rx, cy + ry, ry, Draw.alpha(0xFF000000, Math.round(26 * sh)));
            }
        }
        sd.pop();
    }

    private void drawNametag() {
        for (Body b : bodies()) {
            // above the head, following the swing
            float headX = b.neckX() - (float) Math.sin(b.ang) * b.height * 0.228f;
            float headY = b.neckY() - (float) Math.cos(b.ang) * b.height * 0.228f;
            boolean you = b.id == null;
            float w = you ? tw(b.name, 12, true) + tw("You", 10, false) + 22 : tw(b.name, 11, true) + (b.leader ? 18 : 0) + 16;
            float h = you ? 21 : 19, y = headY - h - 6;
            d.rounded(headX - w / 2, y, headX + w / 2, y + h, 5, col(you ? 0xD90B0E16 : 0xC70B0E16), col(you ? Draw.alpha(Theme.accent(), 170) : 0x26FFFFFF));
            if (you) {
                float x = headX - w / 2 + 8;
                txt(b.name, x, y + h / 2, 12, 0xFFFFFFFF, true);
                txt("You", x + tw(b.name, 12, true) + 6, y + h / 2, 10, Theme.accent(), false);
            } else {
                txt(b.name, headX - w / 2 + 8, y + h / 2, 11, b.online ? 0xFFFFFFFF : 0xFFA3AAB6, true);
                if (b.leader) d.icon(Draw.I_CROWN, headX + w / 2 - 14, y + h / 2, 10, col(0xFFF5C451));
            }
        }
    }

    // ---------------------------------------------------------------- top bar

    private float tabX(int i) {
        float total = 0;
        for (String t : TABS) total += tw(t, 13, false) + 23;
        total -= 23;
        float x = vw / 2 - total / 2;
        for (int j = 0; j < i; j++) x += tw(TABS[j], 13, false) + 23;
        return x;
    }

    private void drawTopBar(double mx, double my) {
        // a little shade behind the bar so it reads on bright backgrounds
        for (int i = 0; i < 8; i++) d.rect(0, i * 9, Math.round(vw) + 1, i * 9 + 9, col(Draw.alpha(0xFF05070B, 70 - i * 9)));
        d.push(); d.translate(24, 14); d.scale(22f / 256f);
        d.g.blit(RenderPipelines.GUI_TEXTURED, PANDA, 0, 0, 0f, 0f, 256, 256, 256, 256, col(0xFFFFFFFF));
        d.pop();
        float x = 54;
        for (char ch : "PANDACLIENT".toCharArray()) {
            String c = String.valueOf(ch);
            txt(c, x, 25, 15, 0xFFFFFFFF, true);
            x += tw(c, 15, true) + 1.6f;
        }
        for (int i = 0; i < TABS.length; i++) {
            float tx = tabX(i), w = tw(TABS[i], 13, false);
            boolean on = i == 0, hov = in(mx, my, tx - 8, 8, tx + w + 8, 42);
            txt(TABS[i], tx, 25, 13, on || hov ? 0xFFFFFFFF : 0xFFB4BAC5, false);
            if (on) d.rounded(tx, 39, tx + w, 41, 1, col(Theme.accent()));
            else if (hov) d.rounded(tx, 39, tx + w, 41, 1, col(0x66FFFFFF));
        }
        // right: you, full screen, quit
        float cx = vw - 36;
        d.icon(Draw.I_CLOSE, cx, 25, 14, col(in(mx, my, cx - 14, 11, cx + 14, 39) ? 0xFFFF7A7A : 0xFFE6E9EE));
        cx = vw - 69;
        d.icon(Draw.I_EXPAND, cx, 25, 14, col(in(mx, my, cx - 14, 11, cx + 14, 39) ? 0xFFFFFFFF : 0xFFE6E9EE));
        float[] eb = essentialBox();
        if (eb != null) {
            boolean hov = in(mx, my, eb[0], eb[1], eb[2], eb[3]);
            d.rounded(eb[0], eb[1], eb[2], eb[3], 13, col(hov ? 0x40FFFFFF : 0x24FFFFFF), col(0x33FFFFFF));
            d.icon(Draw.I_PEOPLE, eb[0] + 15, 25, 13, col(0xFFFFFFFF));
            txt("Essential", eb[0] + 26, 25, 12, 0xFFFFFFFF, true);
        }
        float hx = vw - 120;
        d.rounded(hx - 1, 9, hx + 31, 41, 7, col(0x33FFFFFF));
        boolean face = false;
        if (a > 0.98f) { d.push(); d.translate(hx + 3, 13); d.scale(24f / 24f); face = LobbyPlayer.face(minecraft, d.g, 0, 0, 24); d.pop(); }
        if (!face) txtC(name().substring(0, 1).toUpperCase(java.util.Locale.ROOT), hx + 15, 25, 13, 0xFFFFFFFF, true);
        txtR(name(), hx - 10, 25, 13, 0xFFFFFFFF, true);
    }

    private boolean clickTopBar(double mx, double my) {
        if (my > 44) return false;
        for (int i = 0; i < TABS.length; i++) {
            float tx = tabX(i), w = tw(TABS[i], 13, false);
            if (!in(mx, my, tx - 8, 8, tx + w + 8, 42)) continue;
            switch (i) {
                case 1 -> minecraft.setScreen(new MenuScreen(this));
                case 2 -> minecraft.setScreen(new OptionsScreen(this, minecraft.options));
                default -> {}
            }
            return true;
        }
        if (in(mx, my, vw - 50, 11, vw - 22, 39)) { minecraft.stop(); return true; }
        if (in(mx, my, vw - 83, 11, vw - 55, 39)) { minecraft.getWindow().toggleFullScreen(); return true; }
        float[] eb = essentialBox();
        if (eb != null && in(mx, my, eb[0], eb[1], eb[2], eb[3])) {
            // Essential's social menu, invites and wardrobe live on Minecraft's own title screen
            vanillaTitle = new net.minecraft.client.gui.screens.TitleScreen();
            minecraft.setScreen(vanillaTitle);
            return true;
        }
        return false;
    }

    // ---------------------------------------------------------------- left column

    private void drawLeft(double mx, double my) {
        float x1 = 22, x2 = 292;
        // bottom buttons
        float by = vh - 63, bh = 38;
        card(x1, by, 201, by + bh, 10);
        boolean hHud = in(mx, my, x1, by, 140, by + bh);
        if (hHud) d.rounded(x1 + 3, by + 3, 140, by + bh - 3, 8, col(0x14FFFFFF));
        d.icon(Draw.I_LAYOUT, 46, by + bh / 2, 15, col(0xFFFFFFFF));
        txt("Edit HUD", 62, by + bh / 2, 12, 0xFFFFFFFF, false);
        d.rect(Math.round(144), Math.round(by + 10), Math.round(145), Math.round(by + bh - 10), col(0x22FFFFFF));
        boolean hMods = in(mx, my, 146, by, 201, by + bh);
        if (hMods) d.rounded(148, by + 3, 198, by + bh - 3, 8, col(0x14FFFFFF));
        d.icon(Draw.I_GRID, 173, by + bh / 2, 15, col(0xFFFFFFFF));
        card(215, by, x2, by + bh, 10);
        boolean hSound = in(mx, my, 215, by, 253, by + bh), hOpt = in(mx, my, 253, by, x2, by + bh);
        if (hSound) d.rounded(218, by + 3, 252, by + bh - 3, 8, col(0x14FFFFFF));
        if (hOpt) d.rounded(255, by + 3, x2 - 3, by + bh - 3, 8, col(0x14FFFFFF));
        d.icon(Draw.I_SOUND, 235, by + bh / 2, 15, col(0xFFFFFFFF));
        d.icon(Draw.I_GEAR, 273, by + bh / 2, 15, col(0xFFFFFFFF));

        // party (invites, members, chat)
        float py1 = drawParty(x1, x2, by - 9, mx, my);

        // performance
        float fy2 = py1 - 9, fy1 = fy2 - 38;
        card(x1, fy1, x2, fy2, 10);
        d.icon(Draw.I_GAUGE, 42, (fy1 + fy2) / 2, 13, col(0xFFFFFFFF));
        int fps = minecraft.getFps();
        txt(fps + " FPS", 58, (fy1 + fy2) / 2, 11, 0xFFFFFFFF, true);
        txtR(String.format(java.util.Locale.ROOT, "%.1f ms", 1000f / Math.max(1, fps)), x2 - 12, (fy1 + fy2) / 2, 11, MUTED, false);
    }

    // ---------------------------------------------------------------- party

    /** Things you can click on the party card this frame: x1, y1, x2, y2, what happens. */
    private final java.util.List<Object[]> partyHits = new java.util.ArrayList<>();
    private static String chatDraft = "";
    private static boolean chatFocused, inviteOpen;
    private static final java.util.Map<java.util.UUID, Long> invitedAt = new java.util.HashMap<>();
    private float inviteBtnX, inviteBtnY;

    private void hit(float x1, float y1, float x2, float y2, Runnable r) { partyHits.add(new Object[]{x1, y1, x2, y2, r}); }

    private static String clip(String s, float max, float size, boolean bold, PandaTitleScreen t) {
        if (t.tw(s, size, bold) <= max) return s;
        String e = s;
        while (e.length() > 1 && t.tw(e + "...", size, bold) > max) e = e.substring(0, e.length() - 1);
        return e + "...";
    }

    private void face(java.util.UUID id, String name, boolean me, float x, float y, int size) {
        boolean ok = a > 0.98f && (me ? LobbyPlayer.face(minecraft, d.g, Math.round(x), Math.round(y), size)
            : LobbyPlayer.faceOf(minecraft, d.g, id, name, Math.round(x), Math.round(y), size));
        if (!ok) txtC(name.isEmpty() ? "?" : name.substring(0, 1).toUpperCase(java.util.Locale.ROOT), x + size / 2f, y + size / 2f, size * 0.6f, 0xFFFFFFFF, true);
    }

    /** Draws the party card with its bottom at py2; returns its top. */
    private float drawParty(float x1, float x2, float py2, double mx, double my) {
        partyHits.clear();
        boolean live = com.pandaclient.mod.util.Party.connected();
        var party = com.pandaclient.mod.util.Party.members();
        var invites = com.pandaclient.mod.util.Party.invites();
        var leader = com.pandaclient.mod.util.Party.leader();
        boolean iLead = party.isEmpty() || com.pandaclient.mod.util.Party.iLead(name());
        boolean showJoin = leader != null && !iLead && leader.server() != null && !leader.server().isBlank()
            && !leader.server().equalsIgnoreCase("Singleplayer");
        int rows = party.isEmpty() ? 1 : Math.min(4, party.size());
        float h = 42 + (invites.isEmpty() ? 0 : 34) + rows * 25 + (party.size() > 4 ? 12 : 0) + (showJoin ? 32 : 0) + 56 + 38;
        float py1 = py2 - h;
        card(x1, py1, x2, py2, 10);

        // header: Party pill, Leave, count
        float pw = tw("Party", 12, false) + 20;
        d.rounded(x1 + 10, py1 + 9, x1 + 10 + pw, py1 + 32, 6, col(Theme.accent()));
        txt("Party", x1 + 20, py1 + 20.5f, 12, 0xFFFFFFFF, false);
        String count = (party.isEmpty() ? 1 : party.size()) + " / 8";
        txtR(count, x2 - 12, py1 + 20.5f, 11, DIM, false);
        if (!party.isEmpty() && live) {
            float lx2 = x2 - 22 - tw(count, 11, false), lx1 = lx2 - tw("Leave", 10, false) - 14;
            boolean hl = in(mx, my, lx1, py1 + 11, lx2, py1 + 30);
            d.rounded(lx1, py1 + 11, lx2, py1 + 30, 5, col(hl ? 0x40FF6B6B : 0x18FFFFFF));
            txtC("Leave", (lx1 + lx2) / 2, py1 + 20.5f, 10, hl ? 0xFFFF9A9A : MUTED, false);
            hit(lx1, py1 + 11, lx2, py1 + 30, () -> { com.pandaclient.mod.util.Party.leave(); com.pandaclient.mod.util.PartyLive.banner = "Leaving the party..."; com.pandaclient.mod.util.PartyLive.bannerAt = System.currentTimeMillis(); });
        }
        float y = py1 + 42;

        // an invite for you
        if (!invites.isEmpty()) {
            var inv = invites.get(0);
            d.rounded(x1 + 10, y, x2 - 10, y + 28, 7, col(Draw.alpha(Theme.accent(), 60)), col(Draw.alpha(Theme.accent(), 140)));
            txt(clip(inv.from() + " invited you", 120, 11, true, this), x1 + 18, y + 14, 11, 0xFFFFFFFF, true);
            float ax2 = x2 - 44, ax1 = ax2 - tw("Join", 10.5f, true) - 18;
            boolean ha = in(mx, my, ax1, y + 4, ax2, y + 24), hd = in(mx, my, x2 - 38, y + 4, x2 - 16, y + 24);
            d.rounded(ax1, y + 4, ax2, y + 24, 5, col(ha ? Draw.lerpColor(Theme.accent(), 0xFFFFFFFF, 0.2f) : Theme.accent()));
            txtC("Join", (ax1 + ax2) / 2, y + 14, 10.5f, 0xFFFFFFFF, true);
            d.rounded(x2 - 38, y + 4, x2 - 16, y + 24, 5, col(hd ? 0x40FFFFFF : 0x22FFFFFF));
            d.icon(Draw.I_CLOSE, x2 - 27, y + 14, 9, col(0xFFDDE2EA));
            String id = inv.id();
            hit(ax1, y + 4, ax2, y + 24, () -> com.pandaclient.mod.util.Party.accept(id));
            hit(x2 - 38, y + 4, x2 - 16, y + 24, () -> com.pandaclient.mod.util.Party.decline(id));
            y += 34;
        }

        // members
        if (party.isEmpty()) {
            d.rounded(x1 + 10, y, x1 + 34, y + 24, 5, col(0x33FFFFFF));
            face(null, name(), true, x1 + 12, y + 2, 20);
            txt(name(), x1 + 44, y + 12, 12, 0xFFFFFFFF, true);
            d.icon(Draw.I_CROWN, x1 + 52 + tw(name(), 12, true), y + 12, 11, col(0xFFF5C451));
            txtR("Online", x2 - 12, y + 12, 10, 0xFF6EE08F, false);
            y += 25;
        } else {
            for (int i = 0; i < rows; i++, y += 25) {
                var m = party.get(i);
                boolean me = com.pandaclient.mod.util.Party.isMe(m, name());
                boolean hov = in(mx, my, x1 + 8, y - 2, x2 - 8, y + 22);
                if (hov) d.rounded(x1 + 6, y - 2, x2 - 6, y + 22, 5, col(0x10FFFFFF));
                d.rounded(x1 + 10, y, x1 + 30, y + 20, 4, col(0x33FFFFFF));
                face(m.uuid(), m.name(), me, x1 + 12, y + 2, 16);
                txt(m.name(), x1 + 38, y + 10, 11.5f, 0xFFFFFFFF, true);
                if (m.leader()) d.icon(Draw.I_CROWN, x1 + 46 + tw(m.name(), 11.5f, true), y + 10, 10, col(0xFFF5C451));
                if (hov && iLead && !me && live) {
                    // leader tools: make leader, remove
                    boolean hc = in(mx, my, x2 - 56, y, x2 - 34, y + 20), hk = in(mx, my, x2 - 32, y, x2 - 10, y + 20);
                    d.rounded(x2 - 56, y, x2 - 34, y + 20, 4, col(hc ? 0x40F5C451 : 0x22FFFFFF));
                    d.icon(Draw.I_CROWN, x2 - 45, y + 10, 10, col(0xFFF5C451));
                    d.rounded(x2 - 32, y, x2 - 10, y + 20, 4, col(hk ? 0x40FF6B6B : 0x22FFFFFF));
                    d.icon(Draw.I_CLOSE, x2 - 21, y + 10, 8, col(0xFFFF9A9A));
                    var id = m.uuid();
                    hit(x2 - 56, y, x2 - 34, y + 20, () -> com.pandaclient.mod.util.Party.promote(id));
                    hit(x2 - 32, y, x2 - 10, y + 20, () -> com.pandaclient.mod.util.Party.kick(id));
                } else {
                    String st = me ? "You" : !m.online() ? "Offline" : m.server() != null && !m.server().isBlank() ? m.server() : "Lobby";
                    int sc = me ? Theme.accent() : m.online() ? 0xFF6EE08F : DIM;
                    float room = x2 - 12 - (x1 + 60 + tw(m.name(), 11.5f, true));
                    txtR(clip(st, Math.max(30, room), 10, false, this), x2 - 12, y + 10, 10, sc, false);
                }
            }
            if (party.size() > 4) { txt("+" + (party.size() - 4) + " more", x1 + 12, y + 2, 10, DIM, false); y += 12; }
        }

        // the leader is on a server: join them
        if (showJoin) {
            String sv = leader.server();
            d.rounded(x1 + 10, y + 2, x2 - 10, y + 28, 7, col(0x2A6EE08F), col(0x606EE08F));
            txt(clip(leader.name() + " is on " + sv, 170, 10.5f, false, this), x1 + 18, y + 15, 10.5f, 0xFFFFFFFF, false);
            float jx1 = x2 - 16 - tw("Join", 10.5f, true) - 18;
            boolean hj = in(mx, my, jx1, y + 6, x2 - 16, y + 24);
            d.rounded(jx1, y + 6, x2 - 16, y + 24, 5, col(hj ? 0xFF8BEBA6 : 0xFF6EE08F));
            txtC("Join", (jx1 + x2 - 16) / 2, y + 15, 10.5f, 0xFF0B0F16, true);
            hit(jx1, y + 6, x2 - 16, y + 24, () -> com.pandaclient.mod.util.PartyLive.join(minecraft, sv));
            y += 32;
        }

        // chat: the last three lines
        float cy = py2 - 38 - 54;
        var msgs = com.pandaclient.mod.util.Party.messages();
        if (msgs.isEmpty()) {
            txt(!live ? "Open the game from the PandaClient launcher" : party.isEmpty() ? "Invite friends to party up and chat" : "Say hi to your party!", x1 + 12, cy + 30, 10, DIM, false);
            if (!live) txt("to party up, chat and follow your leader", x1 + 12, cy + 44, 10, DIM, false);
        } else {
            int n = Math.min(3, msgs.size());
            for (int i = 0; i < n; i++) {
                var m = msgs.get(msgs.size() - n + i);
                float ly = cy + 16 + i * 15;
                String who = m.from() + ": ";
                boolean mine = com.pandaclient.mod.util.Party.me() != null && com.pandaclient.mod.util.Party.me().equals(m.fromUuid()) || m.pending();
                txt(who, x1 + 12, ly, 10, mine ? 0xFF6EE08F : 0xFF7FD3FF, true);
                txt(clip(m.text(), x2 - x1 - 26 - tw(who, 10, true), 10, false, this), x1 + 12 + tw(who, 10, true), ly, 10, m.pending() ? MUTED : 0xFFE3E9F1, false);
            }
        }

        // message box + invite button
        float iy = py2 - 38;
        boolean canChat = live && !party.isEmpty();
        d.rounded(x1 + 10, iy, x2 - 40, iy + 28, 7, col(chatFocused ? 0x66000000 : 0x40000000), col(chatFocused ? Draw.alpha(Theme.accent(), 200) : 0x1FFFFFFF));
        if (chatFocused || !chatDraft.isEmpty()) {
            String shown = chatDraft;
            while (shown.length() > 0 && tw(shown, 11, false) > x2 - x1 - 70) shown = shown.substring(1);
            txt(shown, x1 + 20, iy + 14, 11, 0xFFFFFFFF, false);
            if (chatFocused && (System.currentTimeMillis() / 500) % 2 == 0) {
                float cx = x1 + 21 + tw(shown, 11, false);
                d.rect(Math.round(cx), Math.round(iy + 7), Math.round(cx + 1), Math.round(iy + 21), col(0xFFFFFFFF));
            }
        } else txt(!live ? "Start from the launcher to chat" : canChat ? "Message your party (T)" : "Invite friends to chat", x1 + 20, iy + 14, 11, DIM, false);
        hit(x1 + 10, iy, x2 - 40, iy + 28, () -> {
            if (canChat) chatFocused = true;
            else note(live ? "Invite friends first: press the button on the right" : "Start Minecraft from the PandaClient launcher to party up");
        });
        boolean hi = in(mx, my, x2 - 34, iy, x2 - 10, iy + 28);
        d.rounded(x2 - 34, iy, x2 - 10, iy + 28, 7, col(inviteOpen ? Draw.alpha(Theme.accent(), 160) : hi ? 0x60000000 : 0x40000000), col(0x1FFFFFFF));
        d.icon(Draw.I_INVITE, x2 - 22, iy + 14, 13, col(0xFFDDE2EA));
        inviteBtnX = x2 - 34; inviteBtnY = iy;
        hit(x2 - 34, iy, x2 - 10, iy + 28, () -> {
            if (!live) { note("Start Minecraft from the PandaClient launcher to invite friends"); return; }
            inviteOpen = !inviteOpen;
            chatFocused = false;
        });
        return py1;
    }

    private void note(String text) {
        com.pandaclient.mod.util.PartyLive.banner = text;
        com.pandaclient.mod.util.PartyLive.bannerAt = System.currentTimeMillis();
    }

    /** Friends you can invite, in a panel beside the party card. */
    private void drawInviteMenu(double mx, double my) {
        if (!inviteOpen) return;
        var friends = com.pandaclient.mod.util.Party.friends();
        int n = Math.min(8, friends.size());
        float w = 250, x1 = inviteBtnX + 44, x2 = x1 + w;
        float h = 42 + (n == 0 ? 40 : n * 28) + 8, y2 = inviteBtnY + 28, y1 = y2 - h;
        d.rounded(x1, y1, x2, y2, 10, col(0xF00E1117), col(0x33FFFFFF));
        txt("Invite friends", x1 + 14, y1 + 20, 12, 0xFFFFFFFF, true);
        boolean hx = in(mx, my, x2 - 30, y1 + 8, x2 - 8, y1 + 32);
        d.icon(Draw.I_CLOSE, x2 - 19, y1 + 20, 9, col(hx ? 0xFFFFFFFF : MUTED));
        hit(x2 - 30, y1 + 8, x2 - 8, y1 + 32, () -> inviteOpen = false);
        if (n == 0) {
            txt("No PandaClient friends yet.", x1 + 14, y1 + 50, 10.5f, MUTED, false);
            txt("Add friends in the launcher's Friends tab.", x1 + 14, y1 + 66, 10.5f, DIM, false);
        }
        float y = y1 + 40;
        for (int i = 0; i < n; i++, y += 28) {
            var f = friends.get(i);
            face(f.uuid(), f.name(), false, x1 + 14, y + 4, 18);
            txt(f.name(), x1 + 40, y + 9, 11, 0xFFFFFFFF, true);
            String st = !f.online() ? "Offline" : f.server() != null && !f.server().isBlank() ? f.server() : "Online";
            txt(clip(st, 100, 9, false, this), x1 + 40, y + 21, 9, f.online() ? 0xFF6EE08F : DIM, false);
            Long at = invitedAt.get(f.uuid());
            boolean sent = at != null && System.currentTimeMillis() - at < 60_000;
            String label = f.inParty() ? "In party" : sent ? "Invited" : "Invite";
            float bx2 = x2 - 12, bx1 = bx2 - tw(label, 10, true) - 18;
            boolean hb = !f.inParty() && !sent && in(mx, my, bx1, y + 4, bx2, y + 24);
            d.rounded(bx1, y + 4, bx2, y + 24, 5, col(f.inParty() || sent ? 0x22FFFFFF : hb ? Draw.lerpColor(Theme.accent(), 0xFFFFFFFF, 0.2f) : Theme.accent()));
            txtC(label, (bx1 + bx2) / 2, y + 14, 10, f.inParty() || sent ? MUTED : 0xFFFFFFFF, true);
            if (!f.inParty() && !sent) {
                var id = f.uuid();
                String nm = f.name();
                hit(bx1, y + 4, bx2, y + 24, () -> { com.pandaclient.mod.util.Party.invite(id); invitedAt.put(id, System.currentTimeMillis()); note("Invited " + nm + " to your party"); });
            }
        }
        if (friends.size() > n) txt("+" + (friends.size() - n) + " more in the launcher", x1 + 14, y + 4, 9.5f, DIM, false);
        // clicks inside the panel don't close it
        hit(x1, y1, x2, y2, () -> {});
    }

    /** A short party message across the top (who joined, invites sent...). */
    private void drawBanner() {
        String b = com.pandaclient.mod.util.PartyLive.banner;
        long age = System.currentTimeMillis() - com.pandaclient.mod.util.PartyLive.bannerAt;
        if (b == null || age > 4500) return;
        float fade = Math.min(1f, Math.min(age / 200f, (4500 - age) / 400f));
        float w = tw(b, 11.5f, true) + 36, cx = vw / 2, y = 62;
        int al = Math.round(255 * fade * a);
        d.rounded(cx - w / 2, y, cx + w / 2, y + 28, 14, Draw.alpha(0xFF0E1117, Math.round(al * 0.9f)), Draw.alpha(Theme.accent(), Math.round(al * 0.7f)));
        txtC(b, cx, y + 14, 11.5f, Draw.alpha(0xFFFFFFFF, al), true);
    }

    private boolean clickParty(double mx, double my) {
        // the invite panel sits on top, so check the newest hit boxes first
        for (int i = partyHits.size() - 1; i >= 0; i--) {
            Object[] h = partyHits.get(i);
            if (in(mx, my, (float) h[0], (float) h[1], (float) h[2], (float) h[3])) { ((Runnable) h[4]).run(); return true; }
        }
        chatFocused = false;
        inviteOpen = false;
        return false;
    }

    private void sendChat() {
        String text = chatDraft.strip();
        if (text.isEmpty()) { chatFocused = false; return; }
        if (com.pandaclient.mod.util.Party.members().isEmpty()) { note("Invite friends to your party first"); return; }
        com.pandaclient.mod.util.Party.chat(name(), text);
        chatDraft = "";
    }

    @Override
    public boolean keyPressed(KeyEvent e) {
        int key = e.key();
        if (chatFocused) {
            if (key == org.lwjgl.glfw.GLFW.GLFW_KEY_ESCAPE) { chatFocused = false; return true; }
            if (key == org.lwjgl.glfw.GLFW.GLFW_KEY_ENTER || key == org.lwjgl.glfw.GLFW.GLFW_KEY_KP_ENTER) { sendChat(); return true; }
            if (key == org.lwjgl.glfw.GLFW.GLFW_KEY_BACKSPACE) { if (!chatDraft.isEmpty()) chatDraft = chatDraft.substring(0, chatDraft.length() - 1); return true; }
            return true;
        }
        if (inviteOpen && key == org.lwjgl.glfw.GLFW.GLFW_KEY_ESCAPE) { inviteOpen = false; return true; }
        if (card() && (key == org.lwjgl.glfw.GLFW.GLFW_KEY_T || key == org.lwjgl.glfw.GLFW.GLFW_KEY_ENTER)
                && com.pandaclient.mod.util.Party.connected() && !com.pandaclient.mod.util.Party.members().isEmpty()) {
            chatFocused = true;
            ignoreChar = key == org.lwjgl.glfw.GLFW.GLFW_KEY_T;
            return true;
        }
        return super.keyPressed(e);
    }

    /** The T that opened the chat box also arrives as a typed letter: skip it. */
    private boolean ignoreChar;

    @Override
    public boolean charTyped(CharacterEvent e) {
        if (chatFocused) {
            if (ignoreChar) { ignoreChar = false; return true; }
            String c = e.codepointAsString();
            if (chatDraft.length() < 200 && !c.isEmpty() && c.codePointAt(0) >= 32) chatDraft += c;
            return true;
        }
        return super.charTyped(e);
    }

    private boolean clickLeft(double mx, double my) {
        float by = vh - 63, bh = 38;
        if (in(mx, my, 22, by, 140, by + bh)) { minecraft.setScreen(new HudEditorScreen(this)); return true; }
        if (in(mx, my, 146, by, 201, by + bh)) { minecraft.setScreen(new MenuScreen(this)); return true; }
        if (in(mx, my, 215, by, 253, by + bh)) { minecraft.setScreen(new net.minecraft.client.gui.screens.options.SoundOptionsScreen(this, minecraft.options)); return true; }
        if (in(mx, my, 253, by, 292, by + bh)) { minecraft.setScreen(new OptionsScreen(this, minecraft.options)); return true; }
        return false;
    }

    // ---------------------------------------------------------------- server card (bottom right)

    private static boolean multiplayerTab = true;
    private static int picked;
    private net.minecraft.client.multiplayer.ServerList servers;
    private static java.util.List<net.minecraft.world.level.storage.LevelSummary> worlds;
    private static boolean worldsRequested;

    private net.minecraft.client.multiplayer.ServerList servers() {
        if (servers == null) {
            servers = new net.minecraft.client.multiplayer.ServerList(minecraft);
            try { servers.load(); } catch (Exception ignored) {}
        }
        return servers;
    }

    private java.util.List<net.minecraft.world.level.storage.LevelSummary> worlds() {
        if (!worldsRequested) {
            worldsRequested = true;
            try {
                var src = minecraft.getLevelSource();
                src.loadLevelSummaries(src.findLevelCandidates()).thenAccept(list -> {
                    var l = new java.util.ArrayList<>(list);
                    java.util.Collections.sort(l);
                    worlds = l;
                });
            } catch (Throwable ignored) {}
        }
        return worlds == null ? java.util.List.of() : worlds;
    }

    private int count() { return multiplayerTab ? servers().size() : worlds().size(); }

    /** Name, line under it, picture of entry i of the current tab. */
    private Object[] entry(int i) {
        if (multiplayerTab) {
            var sd = servers().get(i);
            var st = com.pandaclient.mod.util.ServerPing.get(sd.ip);
            byte[] saved = sd.getIconBytes();
            byte[] bytes = saved != null ? saved : st != null ? st.icon() : null;
            com.pandaclient.mod.util.IconCache.Icon icon = bytes == null ? null
                : com.pandaclient.mod.util.IconCache.get("s:" + sd.ip + ":" + java.util.Arrays.hashCode(bytes), () -> new java.io.ByteArrayInputStream(bytes));
            // "21,037 online · 11 ms" like OneClient, or why it isn't answering
            String sub = st == null ? "Checking..." : st.failed() ? "Can't reach the server"
                : (st.online() >= 0 ? String.format(java.util.Locale.ROOT, "%,d online", st.online()) : "Online") + "  ·  " + st.ms() + " ms";
            int dot = st == null ? 0xFF8C97A6 : st.failed() ? 0xFFF26D6D : 0xFF41D17D;
            return new Object[]{sd.name, sub, icon, dot};
        }
        var w = worlds().get(i);
        var path = w.getIcon();
        com.pandaclient.mod.util.IconCache.Icon icon = com.pandaclient.mod.util.IconCache.get("w:" + w.getLevelId() + ":" + w.getLastPlayed(),
            () -> path != null && java.nio.file.Files.isRegularFile(path) ? java.nio.file.Files.newInputStream(path) : null);
        long ago = System.currentTimeMillis() - w.getLastPlayed();
        String when = ago < 3_600_000L ? "Played just now" : ago < 86_400_000L ? "Played " + ago / 3_600_000L + "h ago" : "Played " + ago / 86_400_000L + "d ago";
        return new Object[]{w.getLevelName(), when, icon};
    }

    private void picture(Object[] e, float x1, float y1, float size, float r) {
        d.rounded(x1, y1, x1 + size, y1 + size, r, col(0x59000000), col(0x1AFFFFFF));
        var icon = (com.pandaclient.mod.util.IconCache.Icon) e[2];
        float inner = size * 0.84f, o = (size - inner) / 2;
        if (icon != null) {
            d.push(); d.translate(x1 + o, y1 + o); d.scale(inner / icon.w());
            d.g.blit(RenderPipelines.GUI_TEXTURED, icon.id(), 0, 0, 0f, 0f, icon.w(), icon.h(), icon.w(), icon.h(), col(0xFFFFFFFF));
            d.pop();
        } else {
            String n = (String) e[0];
            d.rounded(x1 + o, y1 + o, x1 + o + inner, y1 + o + inner, r * 0.8f, col(Draw.lerpColor(Theme.accent(), 0xFF0B0E16, 0.35f)));
            txtC(n.isEmpty() ? "?" : n.substring(0, 1).toUpperCase(java.util.Locale.ROOT), x1 + size / 2, y1 + size / 2, size * 0.42f, 0xFFFFFFFF, true);
        }
    }

    private float[] cardBox() { return new float[]{vw - 301, vh - 295, vw - 23, vh - 25}; }

    private void drawServerCard(double mx, double my) {
        float[] c = cardBox();
        float x1 = c[0], y1 = c[1], x2 = c[2], y2 = c[3];
        d.rounded(x1, y1, x2, y2, 12, col(0xA60D1120), col(0x2BFFFFFF));
        // tabs
        d.rounded(x1 + 8, y1 + 8, x2 - 8, y1 + 37, 8, col(0x59000000), col(0x1AFFFFFF));
        float half = (x2 - x1 - 16) / 2;
        for (int i = 0; i < 2; i++) {
            boolean on = (i == 1) == multiplayerTab;
            float tx = x1 + 8 + i * half;
            if (on) d.rounded(tx + 3, y1 + 11, tx + half - 3, y1 + 34, 6, col(Theme.accent()));
            else if (in(mx, my, tx, y1 + 8, tx + half, y1 + 37)) d.rounded(tx + 3, y1 + 11, tx + half - 3, y1 + 34, 6, col(0x14FFFFFF));
            txtC(i == 0 ? "Singleplayer" : "Multiplayer", tx + half / 2, y1 + 22.5f, 12, on ? 0xFFFFFFFF : 0xFFC9CED6, false);
        }
        int n = count();
        if (picked >= n) picked = 0;
        float iy = y1 + 57;
        if (n > 0) {
            Object[] e = entry(picked);
            picture(e, x1 + 8, iy, 77, 12);
            txt(Widgets.ellipsize((String) e[0], (int) ((x2 - x1 - 115) * 8 / 17f)), x1 + 98, iy + 28, 17, 0xFFFFFFFF, true);
            if (multiplayerTab) d.rounded(x1 + 98, iy + 49.5f, x1 + 104, iy + 55.5f, 3, col(e.length > 3 ? (int) e[3] : 0xFF41D17D));
            txt(Widgets.ellipsize((String) e[1], (int) ((x2 - x1 - 125) * 8 / 10f)), x1 + (multiplayerTab ? 109 : 98), iy + 52.5f, 10, MUTED, false);
        } else {
            picture(new Object[]{multiplayerTab ? "+" : "+", "", null}, x1 + 8, iy, 77, 12);
            txt(multiplayerTab ? "No servers yet" : "No worlds yet", x1 + 98, iy + 28, 15, 0xFFFFFFFF, true);
            txt(multiplayerTab ? "Add one to start playing" : "Create one to start playing", x1 + 98, iy + 52.5f, 10, MUTED, false);
        }
        // play
        float py = y1 + 169;
        boolean hov = in(mx, my, x1 + 8, py, x2 - 9, py + 47);
        d.rounded(x1 + 8, py, x2 - 9, py + 47, 9, col(hov ? Draw.lerpColor(Theme.accent(), 0xFFFFFFFF, 0.12f) : Theme.accent()));
        txtC(n > 0 ? "Play" : multiplayerTab ? "Add a server" : "Create a world", (x1 + x2) / 2, py + 23.5f, 17, 0xFFFFFFFF, true);
        // recent + all
        float fy = y2 - 21;
        txt("Recent", x1 + 8, fy, 11, MUTED, false);
        int shown = 0;
        for (int i = 0; i < n && shown < 3; i++) {
            if (i == picked) continue;
            float ix = x1 + 50 + shown * 33;
            picture(entry(i), ix, fy - 14, 28, 7);
            if (in(mx, my, ix, fy - 14, ix + 28, fy + 14)) d.rounded(ix, fy - 14, ix + 28, fy + 14, 7, col(0x26FFFFFF));
            shown++;
        }
        String all = "All";
        float aw = tw(all, 11, false) + tw(String.valueOf(n), 11, false) + 34;
        boolean hAll = in(mx, my, x2 - 8 - aw, fy - 14, x2 - 8, fy + 14);
        d.rounded(x2 - 8 - aw, fy - 14, x2 - 8, fy + 14, 8, col(hAll ? 0x26FFFFFF : 0x0DFFFFFF), col(0x33FFFFFF));
        float ax = x2 - aw + 2;
        txt(all, ax, fy, 11, 0xFFFFFFFF, false);
        txt(String.valueOf(n), ax + tw(all, 11, false) + 5, fy, 11, MUTED, false);
        d.icon(Draw.I_ARROW, x2 - 21, fy, 11, col(0xFFFFFFFF));
    }

    private boolean clickCard(double mx, double my) {
        float[] c = cardBox();
        float x1 = c[0], y1 = c[1], x2 = c[2], y2 = c[3];
        if (!in(mx, my, x1, y1, x2, y2)) return false;
        float half = (x2 - x1 - 16) / 2;
        if (in(mx, my, x1 + 8, y1 + 8, x1 + 8 + half, y1 + 37)) { multiplayerTab = false; picked = 0; return true; }
        if (in(mx, my, x1 + 8 + half, y1 + 8, x2 - 8, y1 + 37)) { multiplayerTab = true; picked = 0; return true; }
        int n = count();
        float fy = y2 - 21;
        int shown = 0;
        for (int i = 0; i < n && shown < 3; i++) {
            if (i == picked) continue;
            float ix = x1 + 50 + shown * 33;
            if (in(mx, my, ix, fy - 14, ix + 28, fy + 14)) { picked = i; return true; }
            shown++;
        }
        float py = y1 + 169;
        boolean play = in(mx, my, x1 + 8, py, x2 - 9, py + 47);
        boolean all = in(mx, my, x2 - 90, fy - 14, x2 - 8, fy + 14);
        if (!play && !all) return true;
        if (!multiplayerTab) {
            if (play && n > 0) {
                String id = worlds().get(picked).getLevelId();
                minecraft.createWorldOpenFlows().openWorld(id, () -> minecraft.setScreen(this));
            } else minecraft.setScreen(new SelectWorldScreen(this));
            return true;
        }
        if (play && n > 0) {
            var sd = servers().get(picked);
            net.minecraft.client.gui.screens.ConnectScreen.startConnecting(this, minecraft,
                net.minecraft.client.multiplayer.resolver.ServerAddress.parseString(sd.ip), sd, false, null);
        } else minecraft.setScreen(new JoinMultiplayerScreen(this));
        return true;
    }

    // ---------------------------------------------------------------- footer

    private void drawFooter() {
        float y = vh - 12;
        d.push(); d.translate(22, y - 5); d.scale(10f / 256f);
        d.g.blit(RenderPipelines.GUI_TEXTURED, PANDA, 0, 0, 0f, 0f, 256, 256, 256, 256, col(0xFFFFFFFF));
        d.pop();
        float x = 36;
        txt("PANDACLIENT", x, y, 9, 0xFFFFFFFF, true);
        x += tw("PANDACLIENT", 9, true) + 9;
        txt("Fabric " + mcVersion(), x, y, 9, MUTED, false);
        x += tw("Fabric " + mcVersion(), 9, false) + 8;
        txt("PandaClient " + com.pandaclient.mod.PandaClientMod.VERSION, x, y, 9, MUTED, false);
        txtR("Not affiliated with Mojang or Microsoft", vw - 22, y, 9, MUTED, false);
    }

    @Override
    public boolean mouseClicked(MouseButtonEvent e, boolean doubleClick) {
        if (e.button() == 0 && t() >= 0.6f && card()) {
            zoom();
            double mx = e.x() / k, my = e.y() / k;
            if (clickParty(mx, my) || clickTopBar(mx, my) || clickCard(mx, my) || clickLeft(mx, my)) return true;
        }
        if (card()) {
            if (e.button() == 0) {
                zoom();
                grabbed = bodyAt(e.x() / k, e.y() / k);
                if (grabbed != null) {
                    mouseCX = (float) (e.x() / k); mouseCY = (float) (e.y() / k);
                    grabbed.grounded = false;
                    return true;
                }
            }
            return super.mouseClicked(e, doubleClick);
        }
        if (e.button() != 0 || t() < 0.6f) return super.mouseClicked(e, doubleClick);
        for (int i = 0; i < LABELS.length; i++) {
            int[] b = box(i);
            if (!Widgets.in(e.x(), e.y(), b[0], b[1], b[2], b[3])) continue;
            switch (i) {
                case 0 -> minecraft.setScreen(new SelectWorldScreen(this));
                case 1 -> minecraft.setScreen(new JoinMultiplayerScreen(this));
                case 2 -> minecraft.setScreen(new MenuScreen(this));
                case 3 -> minecraft.setScreen(new OptionsScreen(this, minecraft.options));
                default -> minecraft.stop();
            }
            return true;
        }
        return super.mouseClicked(e, doubleClick);
    }
}
