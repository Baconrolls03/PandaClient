package com.pandaclient.mod.gui;

import net.minecraft.network.chat.Component;

/** PandaClient's flat, rounded buttons, used in place of Minecraft's stone buttons in every menu. */
public final class ButtonStyle {
    private ButtonStyle() {}

    public static void draw(Draw d, int x, int y, int w, int h, Component message, boolean active, boolean hover) { draw(d, x, y, w, h, message, active, hover, 0); }

    private static final net.minecraft.resources.Identifier PANDA = net.minecraft.resources.Identifier.fromNamespaceAndPath("pandaclient", "textures/gui/panda_logo.png");

    /** kind: 0 normal, 1 primary (accent colour), 2 leave/quit (red text), 3 pause list row, 4 pause leave row, 5 pause "Back to Game". */
    public static void draw(Draw d, int x, int y, int w, int h, Component message, boolean active, boolean hover, int kind) {
        if (kind >= 3) { wood(d, x, y, w, h, message.getString(), active, hover, kind); return; }
        if (kind == 1 && active) {
            d.round(x, y, x + w, y + h, hover ? Draw.lerpColor(Theme.accent(), 0xFFFFFFFF, 0.15f) : Theme.accent());
            int ac = Theme.accent();
            float lum = (0.299f * ((ac >> 16) & 255) + 0.587f * ((ac >> 8) & 255) + 0.114f * (ac & 255)) / 255f;
            d.centered(Widgets.ellipsize(message.getString(), w - 8), x + w / 2, y + (h - 8) / 2, lum > 0.6f ? 0xFF0B0F16 : 0xFFFFFFFF, false);
            return;
        }
        int bg = !active ? 0x99121720 : hover ? 0xEE223044 : 0xD9161D29;
        d.round(x, y, x + w, y + h, bg);
        d.rect(x + 2, y, x + w - 2, y + 1, active ? (hover ? 0x40FFFFFF : 0x1FFFFFFF) : 0x0FFFFFFF);
        if (hover && active) d.rect(x + 3, y + h - 1, x + w - 3, y + h, Theme.accent());
        String label = Widgets.ellipsize(message.getString(), w - 8);
        int fg = !active ? 0xFF6E7887 : kind == 2 ? (hover ? 0xFFFF8A8A : 0xFFF06A6A) : hover ? 0xFFFFFFFF : 0xFFE3E9F1;
        d.centered(label, x + w / 2, y + (h - 8) / 2, fg, false);
    }

    private static final net.minecraft.resources.Identifier PLANKS = net.minecraft.resources.Identifier.withDefaultNamespace("textures/block/oak_planks.png");

    /** An empty wooden tile (behind other mods' small icon buttons in the pause menu). */
    public static void woodTile(net.minecraft.client.gui.GuiGraphics g, int x, int y, int w, int h, boolean hover) {
        wood(new Draw(g), x, y, w, h, "", true, hover, 3);
    }

    /** A normal Minecraft-style button made of oak planks (the pause menu). kind 5 = Back to Game, 4 = leave. */
    static void wood(Draw d, int x, int y, int w, int h, String label, boolean active, boolean hover, int kind) {
        var g = d.g;
        // planks, tiled at the button's height
        float s = h / 16f;
        int tile = Math.max(1, Math.round(16 * s));
        g.enableScissor(x, y, x + w, y + h);
        for (int tx = x; tx < x + w; tx += tile) {
            g.pose().pushMatrix();
            g.pose().translate(tx, y);
            g.pose().scale(s, s);
            g.blit(net.minecraft.client.renderer.RenderPipelines.GUI_TEXTURED, PLANKS, 0, 0, 0f, 0f, 16, 16, 16, 16);
            g.pose().popMatrix();
        }
        g.disableScissor();
        // shade: darker when disabled, lighter on hover; Back to Game a touch warmer
        if (!active) g.fill(x, y, x + w, y + h, 0x99000000);
        else if (hover) g.fill(x, y, x + w, y + h, 0x33FFFFFF);
        else g.fill(x, y, x + w, y + h, kind == 5 ? 0x10FFE0A0 : 0x22000000);
        // bevel and outline like vanilla buttons
        g.fill(x + 1, y + 1, x + w - 1, y + 2, active ? 0x55FFFFFF : 0x22FFFFFF);
        g.fill(x + 1, y + h - 3, x + w - 1, y + h - 1, 0x55000000);
        d.outline(x, y, x + w, y + h, hover && active ? 0xFFFFFFFF : 0xFF000000);
        // label in Minecraft's font, with a shadow
        var font = net.minecraft.client.Minecraft.getInstance().font;
        String text = Widgets.ellipsizeMc(label, w - 8);
        int color = !active ? 0xFFA0A0A0 : kind == 4 ? (hover ? 0xFFFF9090 : 0xFFFF6B6B) : hover ? 0xFFFFFFA0 : 0xFFFFFFFF;
        g.drawString(font, text, x + (w - font.width(text)) / 2, y + (h - 8) / 2, color, true);
    }
}
