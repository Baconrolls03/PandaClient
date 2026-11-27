package com.pandaclient.mod.gui;

import com.pandaclient.mod.module.Modules;
import com.pandaclient.mod.util.Game;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.Gui;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.renderer.RenderPipelines;
import net.minecraft.network.chat.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Thin wrapper over GuiGraphics so the mods don't depend on Minecraft's drawing API directly.
 * PandaClient's menus draw text in a smooth font (Poppins) and use soft rounded corners drawn at
 * the screen's real resolution; HUD mods keep Minecraft's own font.
 */
public final class Draw {
    public final GuiGraphics g;
    public Draw(GuiGraphics g) { this.g = g; }

    /** Extra scale the caller has applied with {@link #scale} (so rounded corners stay pixel-sharp). */
    public float zoom = 1f;

    /** True while HUD mods draw: they use Minecraft's font. */
    public static boolean hud;

    static Font font() { return Minecraft.getInstance().font; }

    static boolean smooth() {
        if (hud) return false;
        try { return Modules.TITLE_SCREEN.smoothFont.on(); } catch (Throwable t) { return false; }
    }

    private static final Map<String, Integer> WIDTHS = new HashMap<>(), BOLD_WIDTHS = new HashMap<>();

    static Component ui(String s, boolean bold) { return Component.literal(s).withStyle(bold ? UiFont.BOLD : UiFont.REGULAR); }

    public static int textWidth(String s) {
        if (!smooth()) return font().width(s);
        return cachedWidth(WIDTHS, s, false);
    }
    public static int boldWidth(String s) {
        if (!smooth()) return font().width(s);
        return cachedWidth(BOLD_WIDTHS, s, true);
    }
    private static int cachedWidth(Map<String, Integer> cache, String s, boolean bold) {
        Integer w = cache.get(s);
        if (w == null) {
            if (cache.size() > 4000) cache.clear();
            w = font().width(ui(s, bold));
            cache.put(s, w);
        }
        return w;
    }

    public void rect(int x1, int y1, int x2, int y2, int argb) { if ((argb >>> 24) != 0) g.fill(x1, y1, x2, y2, argb); }

    /** Rounded rectangle with soft corners (radius 3). */
    public void round(int x1, int y1, int x2, int y2, int argb) {
        if (!hud) { rounded(x1, y1, x2, y2, 3, argb); return; }
        // HUD: cheap one-pixel corners (drawn every frame)
        if ((argb >>> 24) == 0) return;
        g.fill(x1 + 1, y1, x2 - 1, y2, argb);
        g.fill(x1, y1 + 1, x1 + 1, y2 - 1, argb);
        g.fill(x2 - 1, y1 + 1, x2, y2 - 1, argb);
    }

    public void outline(int x1, int y1, int x2, int y2, int argb) {
        g.fill(x1, y1, x2, y1 + 1, argb); g.fill(x1, y2 - 1, x2, y2, argb);
        g.fill(x1, y1 + 1, x1 + 1, y2 - 1, argb); g.fill(x2 - 1, y1 + 1, x2, y2 - 1, argb);
    }

    private static float guiScale() {
        try { return Math.max(1f, (float) Minecraft.getInstance().getWindow().getGuiScale()); } catch (Throwable t) { return 2f; }
    }

    /** How far in from the side row {@code i} (0 = outermost) of a corner with radius r starts. */
    private static float inset(float r, int i) {
        float dy = r - (i + 0.5f);
        if (dy <= 0) return 0;
        return r - (float) Math.sqrt(Math.max(0, r * r - dy * dy));
    }

    /** Smooth rounded rectangle; drawn in real screen pixels with anti-aliased edges. */
    public void rounded(float x1, float y1, float x2, float y2, float r, int argb) {
        if ((argb >>> 24) == 0 || x2 <= x1 || y2 <= y1) return;
        float s = guiScale() * zoom;
        int X1 = Math.round(x1 * s), Y1 = Math.round(y1 * s), X2 = Math.round(x2 * s), Y2 = Math.round(y2 * s);
        float R = Math.min(r * s, Math.min(X2 - X1, Y2 - Y1) / 2f);
        int rows = (int) Math.ceil(R);
        g.pose().pushMatrix();
        g.pose().scale(1 / s, 1 / s);
        if (Y2 - rows > Y1 + rows) g.fill(X1, Y1 + rows, X2, Y2 - rows, argb);
        int a = argb >>> 24;
        for (int i = 0; i < rows; i++) {
            float in = inset(R, i);
            int full = (int) Math.ceil(in);
            float cover = full - in; // coverage of the edge pixel just outside the solid run
            int top = Y1 + i, bot = Y2 - 1 - i;
            for (int y : (top == bot ? new int[]{top} : new int[]{top, bot})) {
                g.fill(X1 + full, y, X2 - full, y + 1, argb);
                if (full > 0 && cover > 0.04f) {
                    int edge = alpha(argb, Math.round(a * cover));
                    g.fill(X1 + full - 1, y, X1 + full, y + 1, edge);
                    g.fill(X2 - full, y, X2 - full + 1, y + 1, edge);
                }
            }
        }
        g.pose().popMatrix();
    }

    /** Rounded rectangle with a hairline (one real pixel) border; the border is drawn over the fill. */
    public void rounded(float x1, float y1, float x2, float y2, float r, int fill, int border) {
        float s = guiScale() * zoom;
        float px = 1 / s;
        rounded(x1 + px, y1 + px, x2 - px, y2 - px, Math.max(0, r - px), fill);
        if ((border >>> 24) == 0) return;
        int X1 = Math.round(x1 * s), Y1 = Math.round(y1 * s), X2 = Math.round(x2 * s), Y2 = Math.round(y2 * s);
        float R = Math.min(r * s, Math.min(X2 - X1, Y2 - Y1) / 2f);
        int rows = (int) Math.ceil(R);
        g.pose().pushMatrix();
        g.pose().scale(1 / s, 1 / s);
        // straight edges
        g.fill(X1 + rows, Y1, X2 - rows, Y1 + 1, border);
        g.fill(X1 + rows, Y2 - 1, X2 - rows, Y2, border);
        g.fill(X1, Y1 + rows, X1 + 1, Y2 - rows, border);
        g.fill(X2 - 1, Y1 + rows, X2, Y2 - rows, border);
        // corners: for each row, from the outer curve to the inner curve (one pixel in)
        int a = border >>> 24;
        for (int i = 0; i < rows; i++) {
            float out = inset(R, i);
            float inn = i == 0 ? R : inset(R - 1, i - 1) + 1;
            int o = (int) Math.floor(out), n = Math.max(o + 1, (int) Math.ceil(Math.min(inn, rows)));
            int top = Y1 + i, bot = Y2 - 1 - i;
            float cover = 1 - (out - o);
            int edge = alpha(border, Math.round(a * cover));
            for (int y : new int[]{top, bot}) {
                g.fill(X1 + o, y, X1 + o + 1, y + 1, edge);
                g.fill(X2 - o - 1, y, X2 - o, y + 1, edge);
                if (n > o + 1) {
                    g.fill(X1 + o + 1, y, X1 + n, y + 1, border);
                    g.fill(X2 - n, y, X2 - o - 1, y + 1, border);
                }
            }
        }
        g.pose().popMatrix();
    }

    /** Draws text and returns the x just after it. */
    public int text(String s, int x, int y, int argb, boolean shadow) {
        if (smooth()) {
            g.drawString(font(), ui(s, false), x, y, argb, shadow);
            return x + textWidth(s);
        }
        g.drawString(font(), s, x, y, argb, shadow);
        return x + textWidth(s);
    }
    /** Semi-bold text (Minecraft's font when the smooth font is off). */
    public int bold(String s, int x, int y, int argb) {
        if (smooth()) {
            g.drawString(font(), ui(s, true), x, y, argb, false);
            return x + boldWidth(s);
        }
        g.drawString(font(), s, x, y, argb, false);
        return x + textWidth(s);
    }
    public void centered(String s, int cx, int y, int argb, boolean shadow) { text(s, cx - textWidth(s) / 2, y, argb, shadow); }
    public void boldCentered(String s, int cx, int y, int argb) { bold(s, cx - boldWidth(s) / 2, y, argb); }

    /** Text scaled by {@code k} with its top-left at x, y. */
    public void textScaled(String s, float x, float y, float k, int argb, boolean bold) {
        push(); translate(x, y); scale(k);
        if (bold) bold(s, 0, 0, argb); else text(s, 0, 0, argb, false);
        pop();
    }

    private static final net.minecraft.resources.Identifier ICONS = net.minecraft.resources.Identifier.fromNamespaceAndPath("pandaclient", "textures/gui/icons.png");
    /** PandaClient's line icons (textures/gui/icons.png, 4×4 grid of 64px). */
    public static final int I_CLOSE = 0, I_EXPAND = 1, I_GEAR = 2, I_INVITE = 3, I_IMAGE = 4, I_SOUND = 5, I_DOTS = 6, I_ARROW = 7,
        I_GAUGE = 8, I_CROWN = 9, I_HANGER = 10, I_GRID = 11, I_LAYOUT = 12, I_PLAY = 13, I_GLOBE = 14, I_PEOPLE = 15;
    /** Draws icon {@code i} centred at cx, cy, {@code size} across, tinted {@code argb}. */
    public void icon(int i, float cx, float cy, float size, int argb) {
        push();
        translate(cx - size / 2, cy - size / 2);
        scale(size / 64f);
        g.blit(RenderPipelines.GUI_TEXTURED, ICONS, 0, 0, (i % 4) * 64f, (i / 4) * 64f, 64, 64, 256, 256, argb);
        pop();
    }

    public void push() { g.pose().pushMatrix(); }
    public void pop() { g.pose().popMatrix(); }
    public void translate(float x, float y) { g.pose().translate(x, y); }
    public void scale(float s) { g.pose().scale(s, s); }
    public void enableScissor(int x1, int y1, int x2, int y2) { g.enableScissor(x1, y1, x2, y2); }
    public void disableScissor() { g.disableScissor(); }

    public void item(Game.Stack s, int x, int y) {
        g.renderItem(s.stack(), x, y);
        g.renderItemDecorations(font(), s.stack(), x, y, "");
    }
    public void effectIcon(Game.Effect e, int x, int y) {
        g.blitSprite(RenderPipelines.GUI_TEXTURED, Gui.getMobEffectSprite(e.holder()), x, y, 18, 18);
    }

    public static int lerpColor(int a, int b, float t) {
        t = Math.max(0, Math.min(1, t));
        int aa = a >>> 24, ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
        int ba = b >>> 24, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
        return ((int) (aa + (ba - aa) * t) << 24) | ((int) (ar + (br - ar) * t) << 16) | ((int) (ag + (bg - ag) * t) << 8) | (int) (ab + (bb - ab) * t);
    }
    public static int alpha(int argb, int a) { return (argb & 0xFFFFFF) | (Math.max(0, Math.min(255, a)) << 24); }
}
