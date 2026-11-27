package com.pandaclient.mod.gui;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.client.gui.screens.inventory.InventoryScreen;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * PandaClient pause menu ("Spotlight", like OneClient's): your player on the left, the world or server name,
 * a big "Back to Game" button and the rest of the menu as a list on the right. Built from Minecraft's own
 * buttons, so every button (and ones other mods add) keeps working.
 */
public final class PauseLayout {
    private PauseLayout() {}

    /** The "Back to Game" button (drawn in the accent colour) and the leave button (drawn in red). */
    public static AbstractWidget primary, danger;
    private static int colX, colW, headerY;

    public static void apply(List<AbstractWidget> buttons, AbstractWidget pandaButton, int w, int h) {
        List<AbstractWidget> list = new ArrayList<>();
        for (AbstractWidget b : buttons) if (b.visible && b != pandaButton) list.add(b);
        if (list.isEmpty()) return;
        list.sort(Comparator.comparingInt(AbstractWidget::getY).thenComparingInt(AbstractWidget::getX));
        if (pandaButton != null) list.add(list.size() > 1 ? list.size() - 1 : list.size(), pandaButton);
        colW = Math.min(200, Math.max(130, w / 3));
        colX = w - colW - Math.max(14, w / 12);
        int first = 24, row = 16, gap = 3;
        int total = first + 8 + (list.size() - 1) * (row + gap);
        int y = Math.max(44, (h - total) / 2 + 12);
        headerY = y - 32;
        for (int i = 0; i < list.size(); i++) {
            AbstractWidget b = list.get(i);
            b.setX(colX);
            b.setWidth(colW);
            b.setY(y);
            b.setHeight(i == 0 ? first : row);
            y += (i == 0 ? first + 8 : row + gap);
        }
        primary = list.get(0);
        danger = list.get(list.size() - 1);
    }

    public static void render(GuiGraphics g, int w, int h, int mx, int my) {
        Minecraft mc = Minecraft.getInstance();
        Draw d = new Draw(g);
        boolean single = mc.getSingleplayerServer() != null;
        String place = single ? mc.getSingleplayerServer().getWorldData().getLevelName()
                : mc.getCurrentServer() != null ? mc.getCurrentServer().name : "Multiplayer";
        d.text(single ? "SINGLEPLAYER" : "MULTIPLAYER", colX, headerY, Theme.accent(), false);
        d.text(Widgets.ellipsize(place, colW), colX, headerY + 11, 0xFFFFFFFF, true);
        d.push(); d.translate(colX, headerY + 22); d.scale(0.75f);
        d.text("Game paused", 0, 0, 0xFF9AA4B2, false);
        d.pop();

        // Your player, following the mouse.
        if (mc.player != null) {
            int x1 = Math.max(10, w / 12), x2 = Math.max(x1 + 60, colX - 30);
            int y1 = 30, y2 = h - 34;
            int size = Math.max(30, Math.min((y2 - y1) * 2 / 5, (x2 - x1) / 2));
            try {
                InventoryScreen.renderEntityInInventoryFollowsMouse(g, x1, y1, x2, y2, size, 0.0625f, mx, my, mc.player);
            } catch (Throwable ignored) {
                // another mod changed player rendering: just skip the model
            }
            String name = mc.player.getName().getString();
            int nw = Draw.textWidth(name) + 26;
            int nx = (x1 + x2) / 2 - nw / 2, ny = Math.max(16, (y1 + y2) / 2 - size - 18);
            d.round(nx, ny, nx + nw, ny + 13, 0xB30B0F16);
            d.text(name, nx + 5, ny + 3, 0xFFFFFFFF, false);
            d.push(); d.translate(nx + 8 + Draw.textWidth(name), ny + 4); d.scale(0.7f);
            d.text("You", 0, 0, Theme.accent(), false);
            d.pop();
        }

        // Performance widget, bottom left.
        String fps = mc.getFps() + " FPS";
        int px = 8, py = h - 24;
        d.round(px, py, px + Draw.textWidth(fps) + 22, py + 16, 0xB30B0F16);
        d.rect(px + 6, py + 6, px + 10, py + 10, Theme.accent());
        d.text(fps, px + 14, py + 4, 0xFFE3E9F1, false);
    }
}
