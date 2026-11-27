package com.pandaclient.mod.gui;

import net.minecraft.network.chat.Component;

/** PandaClient's flat, rounded buttons, used in place of Minecraft's stone buttons in every menu. */
public final class ButtonStyle {
    private ButtonStyle() {}

    public static void draw(Draw d, int x, int y, int w, int h, Component message, boolean active, boolean hover) { draw(d, x, y, w, h, message, active, hover, 0); }

    /** kind: 0 normal, 1 primary (accent colour), 2 leave/quit (red text). */
    public static void draw(Draw d, int x, int y, int w, int h, Component message, boolean active, boolean hover, int kind) {
        if (kind == 1 && active) {
            d.round(x, y, x + w, y + h, hover ? Draw.lerpColor(Theme.accent(), 0xFFFFFFFF, 0.15f) : Theme.accent());
            d.centered(Widgets.ellipsize(message.getString(), w - 8), x + w / 2, y + (h - 8) / 2, 0xFF0B0F16, false);
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
