package com.pandaclient.mod.gui;

import com.pandaclient.mod.util.Game;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.Gui;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.renderer.RenderPipelines;

/** Thin wrapper over GuiGraphics so the mods don't depend on Minecraft's drawing API directly. */
public final class Draw {
    public final GuiGraphics g;
    public Draw(GuiGraphics g) { this.g = g; }

    static Font font() { return Minecraft.getInstance().font; }
    public static int textWidth(String s) { return font().width(s); }

    public void rect(int x1, int y1, int x2, int y2, int argb) { if ((argb >>> 24) != 0) g.fill(x1, y1, x2, y2, argb); }

    /** Rounded-looking rectangle (corners cut by one pixel). */
    public void round(int x1, int y1, int x2, int y2, int argb) {
        if ((argb >>> 24) == 0) return;
        g.fill(x1 + 1, y1, x2 - 1, y2, argb);
        g.fill(x1, y1 + 1, x1 + 1, y2 - 1, argb);
        g.fill(x2 - 1, y1 + 1, x2, y2 - 1, argb);
    }

    public void outline(int x1, int y1, int x2, int y2, int argb) {
        g.fill(x1, y1, x2, y1 + 1, argb); g.fill(x1, y2 - 1, x2, y2, argb);
        g.fill(x1, y1 + 1, x1 + 1, y2 - 1, argb); g.fill(x2 - 1, y1 + 1, x2, y2 - 1, argb);
    }

    /** Draws text and returns the x just after it. */
    public int text(String s, int x, int y, int argb, boolean shadow) {
        g.drawString(font(), s, x, y, argb, shadow);
        return x + textWidth(s);
    }
    public void centered(String s, int cx, int y, int argb, boolean shadow) { text(s, cx - textWidth(s) / 2, y, argb, shadow); }

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
