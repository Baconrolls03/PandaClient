package com.pandaclient.mod.gui;

import com.pandaclient.mod.module.Modules;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.multiplayer.JoinMultiplayerScreen;
import net.minecraft.client.gui.screens.options.OptionsScreen;
import net.minecraft.client.gui.screens.worldselection.SelectWorldScreen;
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

    @Override public boolean shouldCloseOnEsc() { return false; }

    private net.minecraft.client.gui.components.AbstractWidget player;
    @Override protected void init() { player = null; }

    /** Your character in the lobby (drag to spin), between the menu and the server card. */
    private void placePlayer(Draw d) {
        if (!card() || !Modules.TITLE_SCREEN.lobbyPlayer.on() || t() < 0.4f) return;
        int ph = Math.min(height - 120, Math.round(height * 0.45f)), pw = Math.round(ph * 0.55f);
        int px = width / 2 - pw / 2, py = height / 2 - ph / 2 + 12;
        if (player == null) {
            player = LobbyPlayer.create(minecraft, pw, ph);
            if (player == null) return;
            player.setX(px);
            player.setY(py);
            addRenderableWidget(player);
        }
        String name = minecraft.getUser() != null ? minecraft.getUser().getName() : "You";
        int nw = Draw.textWidth(name) + 26, nx = px + pw / 2 - nw / 2, ny = py - 14;
        d.round(nx, ny, nx + nw, ny + 13, 0xB30B0F16);
        d.text(name, nx + 5, ny + 3, 0xFFFFFFFF, false);
        d.push(); d.translate(nx + 8 + Draw.textWidth(name), ny + 4); d.scale(0.7f);
        d.text("You", 0, 0, Theme.accent(), false);
        d.pop();
    }
    @Override public boolean isPauseScreen() { return false; }

    private float t() { return (System.currentTimeMillis() - start) / 1000f; }

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
            d.rect(0, 0, width, height, 0x330B0F16);
            float fadeIn = Math.min(1f, t / 0.8f);
            if (fadeIn < 1) d.rect(0, 0, width, height, Draw.alpha(0xFF000000, (int) ((1 - fadeIn) * 255)));
            return;
        }
        // soft vignette: darker top and bottom so the logo and buttons read clearly
        int bands = 24;
        for (int i = 0; i < bands; i++) {
            float f = 1 - i / (float) bands;
            int a = (int) (f * f * 150);
            int h1 = height * i / (bands * 4), h2 = height * (i + 1) / (bands * 4);
            d.rect(0, h1, width, h2 + 1, Draw.alpha(0xFF070A12, a));
            d.rect(0, height - h2 - 1, width, height - h1, Draw.alpha(0xFF070A12, (int) (a * 1.3f)));
        }
        d.rect(0, 0, width, height, 0x22070A12);

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
        if (card()) drawTopBar(d, mx, my, ease);
        placePlayer(d);
        if (card()) drawCard(d, mx, my, ease);

        if (card()) { drawLobbyWidgets(d, ease); return; }
        // footer
        int mods = FabricLoader.getInstance().getAllMods().size();
        int fa = (int) (170 * ease);
        d.text("Minecraft " + FabricLoader.getInstance().getModContainer("minecraft").map(c -> c.getMetadata().getVersion().getFriendlyString()).orElse("") + "  ·  " + mods + " mods", 6, height - 12, Draw.alpha(0xFFFFFFFF, fa), true);
        String who = minecraft.getUser() != null ? "Signed in as " + minecraft.getUser().getName() : "PandaClient";
        d.text(who, width - Draw.textWidth(who) - 6, height - 12, Draw.alpha(0xFFFFFFFF, fa), true);
    }

    /** Frosted-glass panel like OneClient's lobby cards. */
    private static void glass(Draw d, int x1, int y1, int x2, int y2, int a) {
        d.round(x1, y1, x2, y2, Draw.alpha(0xFF101622, (int) (190 * a / 255f)));
        d.rect(x1 + 3, y1, x2 - 3, y1 + 1, Draw.alpha(0xFFFFFFFF, (int) (28 * a / 255f)));
    }

    private void drawLobbyWidgets(Draw d, float ease) {
        int a = (int) (255 * ease);
        int x = 10, w = Math.min(150, width / 4);
        // performance
        int y = height / 2 - 44;
        glass(d, x, y, x + w, y + 20, a);
        d.rect(x + 7, y + 8, x + 11, y + 12, Draw.alpha(0xFF6EE08F, a));
        d.text(minecraft.getFps() + " FPS", x + 15, y + 6, Draw.alpha(0xFFFFFFFF, a), false);
        String ver = "Minecraft " + FabricLoader.getInstance().getModContainer("minecraft").map(c -> c.getMetadata().getVersion().getFriendlyString()).orElse("");
        d.push(); d.translate(x + w - 6 - Draw.textWidth(ver) * 0.7f, y + 7.5f); d.scale(0.7f);
        d.text(ver, 0, 0, Draw.alpha(0xFF9AA4B2, a), false);
        d.pop();
        // party
        y += 26;
        glass(d, x, y, x + w, y + 66, a);
        d.round(x + 6, y + 6, x + 34, y + 17, Draw.alpha(0xFF4C6FFF, a));
        d.text("Party", x + 9, y + 8, Draw.alpha(0xFFFFFFFF, a), false);
        String me = minecraft.getUser() != null ? minecraft.getUser().getName() : "You";
        d.text(Widgets.ellipsize(me, w - 16), x + 8, y + 24, Draw.alpha(0xFFE3E9F1, a), false);
        d.push(); d.translate(x + 8, y + 36); d.scale(0.7f);
        for (String line : Widgets.wrap("Invite friends from the PandaClient launcher (Friends) and join their server in one click.", (int) ((w - 16) / 0.7f), 3)) {
            d.text(line, 0, 0, Draw.alpha(0xFF9AA4B2, a), false);
            d.translate(0, 10);
        }
        d.pop();
        // bottom bar
        d.rect(0, height - 12, width, height, Draw.alpha(0xFF070A12, (int) (170 * ease)));
        d.push(); d.translate(6, height - 9); d.scale(0.7f);
        d.text("PANDACLIENT  ·  Fabric  ·  " + FabricLoader.getInstance().getAllMods().size() + " mods", 0, 0, Draw.alpha(0xFFB7C0CC, a), false);
        d.pop();
        String c = "Not affiliated with Mojang or Microsoft";
        d.push(); d.translate(width - 6 - Draw.textWidth(c) * 0.7f, height - 9); d.scale(0.7f);
        d.text(c, 0, 0, Draw.alpha(0xFF7C8796, a), false);
        d.pop();
    }

    // ---------------------------------------------------------------- top bar (OneClient style)

    private static final Identifier PANDA = Identifier.fromNamespaceAndPath("pandaclient", "textures/gui/panda_logo.png");
    private static final String[] TABS = {"Play", "Mods", "Cosmetics", "Options", "Quit"};

    private int tabX(int i) {
        int total = 0;
        for (String t : TABS) total += Draw.textWidth(t) + 16;
        int x = width / 2 - total / 2;
        for (int k = 0; k < i; k++) x += Draw.textWidth(TABS[k]) + 16;
        return x;
    }

    private void drawTopBar(Draw d, int mx, int my, float ease) {
        int a = (int) (255 * ease);
        d.rect(0, 0, width, 22, Draw.alpha(0xFF070A12, (int) (140 * ease)));
        d.g.pose().pushMatrix();
        d.g.pose().translate(7, 4);
        d.g.pose().scale(14f / 256f, 14f / 256f);
        d.g.blit(RenderPipelines.GUI_TEXTURED, PANDA, 0, 0, 0f, 0f, 256, 256, 256, 256);
        d.g.pose().popMatrix();
        d.text("PANDACLIENT", 25, 7, Draw.alpha(0xFFFFFFFF, a), false);
        for (int i = 0; i < TABS.length; i++) {
            int x = tabX(i), w = Draw.textWidth(TABS[i]) + 16;
            boolean hov = Widgets.in(mx, my, x, 2, w, 18), on = i == 0;
            d.centered(TABS[i], x + w / 2, 7, Draw.alpha(on || hov ? 0xFFFFFFFF : 0xFF9AA4B2, a), false);
            if (on) d.rect(x + 6, 19, x + w - 6, 20, Draw.alpha(0xFF4C6FFF, a));
        }
        String who = minecraft.getUser() != null ? minecraft.getUser().getName() : "";
        d.text(who, width - Draw.textWidth(who) - 8, 7, Draw.alpha(0xFFE3E9F1, a), false);
    }

    private boolean clickTopBar(double mx, double my) {
        if (my > 21) return false;
        for (int i = 0; i < TABS.length; i++) {
            if (!Widgets.in(mx, my, tabX(i), 2, Draw.textWidth(TABS[i]) + 16, 18)) continue;
            switch (i) {
                case 1 -> minecraft.setScreen(new MenuScreen(this));
                case 2 -> minecraft.setScreen(MenuScreen.openAt(this, Modules.COSMETICS));
                case 3 -> minecraft.setScreen(new OptionsScreen(this, minecraft.options));
                case 4 -> minecraft.stop();
                default -> {}
            }
            return true;
        }
        return false;
    }

    // ---------------------------------------------------------------- server card (bottom right)

    private static boolean multiplayerTab = true;
    private net.minecraft.client.multiplayer.ServerList servers;

    private net.minecraft.client.multiplayer.ServerList servers() {
        if (servers == null) {
            servers = new net.minecraft.client.multiplayer.ServerList(minecraft);
            try { servers.load(); } catch (Exception ignored) {}
        }
        return servers;
    }

    private int[] cardBox() {
        int cw = Math.min(180, width / 2 - 30), ch = 112;
        return new int[]{width - cw - 14, height - ch - 22, cw, ch};
    }

    private void drawCard(Draw d, int mx, int my, float ease) {
        int[] c = cardBox();
        int a = (int) (255 * ease);
        int x = c[0], y = c[1] + Math.round((1 - ease) * 12), w = c[2], h = c[3];
        glass(d, x, y, x + w, y + h, a);
        d.round(x + 4, y + 4, x + w - 4, y + 18, Draw.alpha(0xFF0A0E16, (int) (160 * ease)));
        // tabs
        int tw = (w - 8) / 2;
        for (int i = 0; i < 2; i++) {
            boolean on = (i == 1) == multiplayerTab;
            int tx = x + 4 + i * tw;
            if (on) d.round(tx, y + 4, tx + tw, y + 18, Draw.alpha(0xFF4C6FFF, a));
            d.centered(i == 0 ? "Singleplayer" : "Multiplayer", tx + tw / 2, y + 7, Draw.alpha(on ? 0xFFFFFFFF : 0xFF8C97A6, a), false);
        }
        int iy = y + 26;
        String title, sub;
        if (multiplayerTab) {
            var list = servers();
            if (list.size() > 0) { var sd = list.get(0); title = sd.name; sub = sd.ip; }
            else { title = "No servers yet"; sub = "Add one to start playing"; }
        } else { title = "Your worlds"; sub = "Pick a world or make a new one"; }
        d.round(x + 8, iy, x + 36, iy + 28, Draw.alpha(0xFF4C6FFF, a));
        d.centered(title.isEmpty() ? "?" : title.substring(0, 1).toUpperCase(java.util.Locale.ROOT), x + 22, iy + 10, Draw.alpha(0xFFFFFFFF, a), false);
        d.text(Widgets.ellipsize(title, w - 50), x + 42, iy + 5, Draw.alpha(0xFFFFFFFF, a), false);
        d.push(); d.translate(x + 42, iy + 17); d.scale(0.75f);
        d.text(Widgets.ellipsize(sub, (int) ((w - 50) / 0.75f)), 0, 0, Draw.alpha(0xFF9AA4B2, a), false);
        d.pop();
        // big play button
        int by = y + h - 42;
        boolean hov = Widgets.in(mx, my, x + 8, by, w - 16, 22);
        d.round(x + 8, by, x + w - 8, by + 22, Draw.alpha(hov ? Draw.lerpColor(0xFF3F6BFF, 0xFFFFFFFF, 0.12f) : 0xFF3F6BFF, a));
        String label = multiplayerTab ? (servers().size() > 0 ? "Play" : "Add a server") : "Choose a world";
        d.centered(label, x + w / 2, by + 7, Draw.alpha(0xFFFFFFFF, a), false);
        boolean allHov = Widgets.in(mx, my, x + w - 60, y + h - 15, 56, 11);
        d.push(); d.translate(x + w - 8 - Draw.textWidth(multiplayerTab ? "All servers >" : "All worlds >") * 0.75f, y + h - 12); d.scale(0.75f);
        d.text(multiplayerTab ? "All servers >" : "All worlds >", 0, 0, Draw.alpha(allHov ? 0xFFFFFFFF : 0xFF8C97A6, a), false);
        d.pop();
    }

    private boolean clickCard(double mx, double my) {
        int[] c = cardBox();
        int x = c[0], y = c[1], w = c[2], h = c[3];
        if (!Widgets.in(mx, my, x, y, w, h)) return false;
        int tw = (w - 8) / 2;
        if (Widgets.in(mx, my, x + 4, y + 4, tw, 14)) { multiplayerTab = false; return true; }
        if (Widgets.in(mx, my, x + 4 + tw, y + 4, tw, 14)) { multiplayerTab = true; return true; }
        boolean play = Widgets.in(mx, my, x + 8, y + h - 42, w - 16, 22);
        boolean all = Widgets.in(mx, my, x + w - 60, y + h - 15, 56, 11);
        if (!play && !all) return true;
        if (!multiplayerTab) { minecraft.setScreen(new SelectWorldScreen(this)); return true; }
        var list = servers();
        if (play && list.size() > 0) {
            var sd = list.get(0);
            net.minecraft.client.gui.screens.ConnectScreen.startConnecting(this, minecraft,
                net.minecraft.client.multiplayer.resolver.ServerAddress.parseString(sd.ip), sd, false, null);
        } else minecraft.setScreen(new JoinMultiplayerScreen(this));
        return true;
    }

    @Override
    public boolean mouseClicked(MouseButtonEvent e, boolean doubleClick) {
        if (e.button() == 0 && t() >= 0.6f && card() && (clickTopBar(e.x(), e.y()) || clickCard(e.x(), e.y()))) return true;
        if (card()) return super.mouseClicked(e, doubleClick);
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
