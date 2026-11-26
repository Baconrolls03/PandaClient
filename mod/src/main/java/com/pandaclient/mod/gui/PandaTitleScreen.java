package com.pandaclient.mod.gui;

import com.pandaclient.mod.module.Modules;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.multiplayer.JoinMultiplayerScreen;
import net.minecraft.client.gui.screens.options.OptionsScreen;
import net.minecraft.client.gui.screens.worldselection.SelectWorldScreen;
import net.minecraft.client.input.MouseButtonEvent;
import net.minecraft.network.chat.Component;

/**
 * PandaClient's main menu: an animated night scene (stars, moon, hills, swaying bamboo, fireflies)
 * with the PandaClient logo and big, simple buttons.
 */
public final class PandaTitleScreen extends Screen {
    private final long start = System.currentTimeMillis();
    private final float[] hover = new float[5];
    private static final String[] LABELS = {"Singleplayer", "Multiplayer", "PandaClient Mods", "Options", "Quit Game"};

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
        int w = width, h = height;
        // sky: deep navy at the top fading to violet near the hills
        int steps = 48;
        for (int i = 0; i < steps; i++) {
            float f = i / (float) (steps - 1);
            int c = Draw.lerpColor(0xFF0B1022, 0xFF3B2659, f * f);
            d.rect(0, h * i / steps, w, h * (i + 1) / steps + 1, c);
        }
        // stars
        if (Modules.TITLE_SCREEN.stars.on()) {
            for (int i = 0; i < 90; i++) {
                int x = (int) (hash(i, 1) * w), y = (int) (hash(i, 2) * h * 0.6f);
                float tw = 0.5f + 0.5f * (float) Math.sin(t * (1 + hash(i, 3) * 2) + i);
                int a = (int) (90 + 165 * tw);
                int s = hash(i, 4) > 0.85f ? 2 : 1;
                d.rect(x, y, x + s, y + s, Draw.alpha(0xFFFFFFFF, a));
            }
        }
        // moon with a soft glow
        int mxp = (int) (w * 0.8f), myp = (int) (h * 0.2f);
        for (int r = 26; r > 12; r -= 4) d.round(mxp - r, myp - r, mxp + r, myp + r, Draw.alpha(0xFFF3E7C4, 12));
        d.round(mxp - 12, myp - 12, mxp + 12, myp + 12, 0xFFF3E7C4);
        d.rect(mxp - 5, myp - 4, mxp - 1, myp, 0xFFE2D3A8);
        d.rect(mxp + 3, myp + 3, mxp + 7, myp + 6, 0xFFE2D3A8);
        // three layers of hills, slowly drifting
        hills(d, w, h, 0.62f, 26, 0.011f, t * 4, 0xFF2A1E44);
        hills(d, w, h, 0.72f, 20, 0.017f, t * 8, 0xFF1E1734);
        hills(d, w, h, 0.83f, 14, 0.025f, t * 14, 0xFF130F22);
        // bamboo in the foreground, swaying
        for (int i = 0; i < 9; i++) {
            float side = i < 5 ? i * 16 + 6 : w - (i - 5) * 16 - 14;
            int bh = (int) (h * (0.45f + hash(i, 9) * 0.3f));
            float sway = (float) Math.sin(t * 0.8f + i) * 3;
            for (int y = h; y > h - bh; y -= 2) {
                float k = (h - y) / (float) bh;
                int x = (int) (side + sway * k * k);
                d.rect(x, y - 2, x + 4, y, (h - y) % 22 < 2 ? 0xFF0A1A14 : 0xFF14281F);
            }
            int topX = (int) (side + sway);
            d.rect(topX - 6, h - bh, topX + 2, h - bh + 2, 0xFF1B3A2B);
            d.rect(topX + 2, h - bh + 6, topX + 10, h - bh + 8, 0xFF1B3A2B);
        }
        // fireflies
        if (Modules.TITLE_SCREEN.fireflies.on()) {
            for (int i = 0; i < 18; i++) {
                float x = hash(i, 5) * w + (float) Math.sin(t * 0.4f + i) * 30;
                float y = h * 0.6f + hash(i, 6) * h * 0.35f + (float) Math.cos(t * 0.6f + i * 2) * 12;
                int a = (int) (120 + 135 * (0.5f + 0.5f * Math.sin(t * 3 + i)));
                d.rect((int) x, (int) y, (int) x + 2, (int) y + 2, Draw.alpha(0xFFFFE27A, a));
                d.rect((int) x - 1, (int) y - 1, (int) x + 3, (int) y + 3, Draw.alpha(0xFFFFE27A, a / 6));
            }
        }
    }

    private static void hills(Draw d, int w, int h, float base, int amp, float freq, float shift, int color) {
        for (int x = 0; x < w; x += 2) {
            float xx = x + shift;
            double y = h * base - amp * (Math.sin(xx * freq) * 0.6 + Math.sin(xx * freq * 2.3 + 1.7) * 0.3 + Math.sin(xx * freq * 5.1 + 4) * 0.1);
            d.rect(x, (int) y, x + 2, h, color);
        }
    }

    private int bw() { return Math.min(200, width - 40); }
    private int bx() { return width / 2 - bw() / 2; }
    private int by(int i) { return height / 2 - 10 + i * 24; }

    @Override
    public void render(GuiGraphics g, int mx, int my, float delta) {
        super.render(g, mx, my, delta);
        Draw d = new Draw(g);
        float t = t();
        // logo: a pixel panda head and the name
        int ly = height / 2 - 78 + (int) Math.round(Math.sin(t * 1.5) * 2);
        int cx = width / 2;
        int ph = 28, px = cx - ph / 2, pyy = ly;
        d.rect(px - 4, pyy - 4, px + 6, pyy + 6, 0xFF141B24);
        d.rect(px + ph - 6, pyy - 4, px + ph + 4, pyy + 6, 0xFF141B24);
        d.round(px, pyy, px + ph, pyy + ph, 0xFFF3F5F8);
        d.rect(px + 4, pyy + 9, px + 11, pyy + 17, 0xFF141B24);
        d.rect(px + ph - 11, pyy + 9, px + ph - 4, pyy + 17, 0xFF141B24);
        d.rect(px + 7, pyy + 11, px + 9, pyy + 13, Theme.accent());
        d.rect(px + ph - 9, pyy + 11, px + ph - 7, pyy + 13, Theme.accent());
        d.rect(px + 12, pyy + 19, px + ph - 12, pyy + 22, 0xFF141B24);
        d.push();
        d.translate(cx, ly + ph + 6);
        d.scale(2f);
        String a = "PANDA", b = "CLIENT";
        int tw = Draw.textWidth(a + b);
        int x = d.text(a, -tw / 2, 0, Theme.accent(), true);
        d.text(b, x, 0, 0xFFF3F5F8, true);
        d.pop();

        // buttons
        for (int i = 0; i < LABELS.length; i++) {
            int x0 = bx(), y0 = by(i), w = bw();
            if (i >= 3) { w = bw() / 2 - 2; if (i == 4) x0 = bx() + bw() / 2 + 2; y0 = by(3); }
            boolean hov = Widgets.in(mx, my, x0, y0, w, 20);
            hover[i] += ((hov ? 1 : 0) - hover[i]) * 0.25f;
            int bg = Draw.lerpColor(0xB0141B24, 0xE01E2733, hover[i]);
            d.round(x0, y0, x0 + w, y0 + 20, bg);
            int edge = Draw.lerpColor(0x40FFFFFF, Theme.accent(), hover[i]);
            d.rect(x0 + 1, y0 + 19, x0 + w - 1, y0 + 20, edge);
            if (i == 2) d.rect(x0 + 1, y0, x0 + 3, y0 + 20, Theme.accent());
            int lift = Math.round(hover[i] * 1);
            d.centered(LABELS[i], x0 + w / 2, y0 + 6 - lift, hov ? 0xFFFFFFFF : 0xFFD6DEE8, true);
        }

        int mods = FabricLoader.getInstance().getAllMods().size();
        d.text("Minecraft 1.21.11 (" + mods + " mods)", 4, height - 12, 0xA0FFFFFF, true);
        String r = "PandaClient";
        d.text(r, width - Draw.textWidth(r) - 4, height - 12, 0xA0FFFFFF, true);
    }

    @Override
    public boolean mouseClicked(MouseButtonEvent e, boolean doubleClick) {
        if (e.button() != 0) return super.mouseClicked(e, doubleClick);
        for (int i = 0; i < LABELS.length; i++) {
            int x0 = bx(), y0 = by(i), w = bw();
            if (i >= 3) { w = bw() / 2 - 2; if (i == 4) x0 = bx() + bw() / 2 + 2; y0 = by(3); }
            if (!Widgets.in(e.x(), e.y(), x0, y0, w, 20)) continue;
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
