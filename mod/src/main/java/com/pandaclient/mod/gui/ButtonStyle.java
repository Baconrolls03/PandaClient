package com.pandaclient.mod.gui;

import net.minecraft.network.chat.Component;

/** PandaClient's flat, rounded buttons, used in place of Minecraft's stone buttons in every menu. */
public final class ButtonStyle {
    private ButtonStyle() {}

    public static void draw(Draw d, int x, int y, int w, int h, Component message, boolean active, boolean hover) { draw(d, x, y, w, h, message, active, hover, 0); }

    private static final net.minecraft.resources.Identifier PANDA = net.minecraft.resources.Identifier.fromNamespaceAndPath("pandaclient", "textures/gui/panda_logo.png");

    /** kind: 0 normal, 1 primary (accent colour), 2 leave/quit (red text), 3 pause list row, 4 pause leave row, 5 pause "Back to Game". */
    public static void draw(Draw d, int x, int y, int w, int h, Component message, boolean active, boolean hover, int kind) {
        if (kind == 5) {
            float k = PauseLayout.k;
            d.rounded(x, y, x + w, y + h, Math.max(3, 9 * k), hover ? Draw.lerpColor(Theme.accent(), 0xFFFFFFFF, 0.12f) : Theme.accent());
            float size = 15 * k;
            String label = message.getString();
            d.textScaled(label, x + w / 2f - Draw.widthF(label, true) * size / 16f, y + h / 2f - size * Canvas.MID, size / 8f, 0xFFFFFFFF, true);
            return;
        }
        if (kind == 3 || kind == 4) {
            float k = PauseLayout.k;
            if (hover && active) d.rounded(x, y, x + w, y + h, Math.max(2, 7 * k), 0x1FFFFFFF);
            int fg = !active ? 0xFF6E7887 : kind == 4 ? (hover ? 0xFFFF8A8A : 0xFFF06A6A) : hover ? 0xFFFFFFFF : 0xFFDCE1E8;
            String label = message.getString();
            int icon = PauseLayout.iconFor(label);
            float cy = y + h / 2f, is = 14 * k;
            if (icon >= 0) d.icon(icon, x + 14 * k, cy, is, fg);
            else {
                d.push(); d.translate(x + 14 * k - is / 2, cy - is / 2); d.scale(is / 256f);
                d.g.blit(net.minecraft.client.renderer.RenderPipelines.GUI_TEXTURED, PANDA, 0, 0, 0f, 0f, 256, 256, 256, 256);
                d.pop();
            }
            float size = 12.5f * k;
            d.textScaled(Widgets.ellipsize(label, Math.round((w - 34 * k) * 8 / size)), x + 30 * k, cy - size * Canvas.MID, size / 8f, fg, false);
            return;
        }
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
}
