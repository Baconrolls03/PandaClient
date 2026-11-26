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
        float cover = Math.max(width / (float) BG_W, height / (float) BG_H);
        float zoom = 1.06f + 0.015f * (float) Math.sin(t * 0.12f);
        float s = cover * zoom;
        float dw = BG_W * s, dh = BG_H * s;
        float ox = (width - dw) / 2f - (mouseX - 0.5f) * width * 0.04f;
        float oy = (height - dh) / 2f - (mouseY - 0.5f) * height * 0.03f;
        g.pose().pushMatrix();
        g.pose().translate(ox, oy);
        g.pose().scale(s, s);
        g.blit(RenderPipelines.GUI_TEXTURED, BG, 0, 0, 0f, 0f, BG_W, BG_H, BG_W, BG_H);
        g.pose().popMatrix();

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

    private int bw() { return Math.min(210, width - 40); }
    private int bx() { return width / 2 - bw() / 2; }
    private int top() { return Math.max(height / 2 - 6, logoH() + 20); }
    private int logoW() { return Math.min(width - 40, Math.min(330, (int) (width * 0.42f))); }
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

        // logo, floating gently
        int lw = logoW(), lh = logoH();
        float ly = top() - lh - 14 + (float) Math.sin(t * 1.2f) * 2.5f - (1 - ease) * 12;
        g.pose().pushMatrix();
        g.pose().translate(width / 2f - lw / 2f, ly);
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

        // footer
        int mods = FabricLoader.getInstance().getAllMods().size();
        int fa = (int) (170 * ease);
        d.text("Minecraft 1.21.11  ·  " + mods + " mods", 6, height - 12, Draw.alpha(0xFFFFFFFF, fa), true);
        String who = minecraft.getUser() != null ? "Signed in as " + minecraft.getUser().getName() : "PandaClient";
        d.text(who, width - Draw.textWidth(who) - 6, height - 12, Draw.alpha(0xFFFFFFFF, fa), true);
    }

    @Override
    public boolean mouseClicked(MouseButtonEvent e, boolean doubleClick) {
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
