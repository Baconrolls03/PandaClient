package com.pandaclient.mod.gui;

import com.pandaclient.mod.Keys;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.client.gui.screens.inventory.InventoryScreen;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.WeakHashMap;

/**
 * PandaClient pause menu, laid out like OneClient's: your character large on the left, the world or server
 * on the right with a big "Back to Game" button and the rest of the menu as a list with icons. It is built
 * from Minecraft's own buttons, so every button (and ones other mods add) keeps working.
 */
public final class PauseLayout {
    private PauseLayout() {}

    /** The "Back to Game" button (big, accent colour), the leave button (red) and the list rows. */
    public static AbstractWidget primary, danger;
    public static final Set<AbstractWidget> rows = Collections.newSetFromMap(new WeakHashMap<>());
    /** GUI pixels per canvas unit while the pause menu is open. */
    public static float k = 1f;
    private static float colX, colW;

    private static final float HEAD_TOP = 150, MODEL = 430;

    public static void apply(List<AbstractWidget> buttons, AbstractWidget pandaButton, int w, int h) {
        List<AbstractWidget> list = new ArrayList<>();
        for (AbstractWidget b : buttons) {
            if (b == pandaButton || !b.visible) continue;
            if (b instanceof net.minecraft.client.gui.components.AbstractButton) list.add(b);
            else if (b instanceof net.minecraft.client.gui.components.StringWidget) b.visible = false; // the "Game Menu" title: our header replaces it
        }
        if (list.isEmpty()) return;
        list.sort(Comparator.comparingInt(AbstractWidget::getY).thenComparingInt(AbstractWidget::getX));
        if (pandaButton != null) list.add(list.size() > 1 ? list.size() - 1 : list.size(), pandaButton);
        k = Canvas.scaleFor(h);
        float vw = w / k;
        colW = Math.min(315, vw * 0.27f);
        colX = vw - colW - vw * 0.06f;
        float y = 262, step = Math.min(33, (690 - 322) / (float) Math.max(1, list.size() - 1));
        rows.clear();
        for (int i = 0; i < list.size(); i++) {
            AbstractWidget b = list.get(i);
            float bh = i == 0 ? 44 : Math.min(30, step - 2);
            b.setX(Math.round(colX * k));
            b.setWidth(Math.round(colW * k));
            b.setY(Math.round(y * k));
            b.setHeight(Math.max(8, Math.round(bh * k)));
            if (i > 0) rows.add(b);
            y = i == 0 ? 322 : y + step;
        }
        primary = list.get(0);
        danger = list.get(list.size() - 1);
    }

    /** Line icon for a pause menu button, or -1 for the PandaClient logo. */
    public static int iconFor(String label) {
        String s = label.toLowerCase(Locale.ROOT);
        if (s.contains("pandaclient")) return -1;
        if (s.contains("option")) return Draw.I_GEAR;
        if (s.contains("advancement")) return Draw.I_CROWN;
        if (s.contains("statistic")) return Draw.I_GAUGE;
        if (s.contains("mod")) return Draw.I_GRID;
        if (s.contains("lan") || s.contains("host") || s.contains("link")) return Draw.I_GLOBE;
        if (s.contains("player report") || s.contains("social")) return Draw.I_PEOPLE;
        if (s.contains("disconnect") || s.contains("quit") || s.contains("leave")) return Draw.I_CLOSE;
        if (s.contains("report") || s.contains("feedback")) return Draw.I_DOTS;
        return Draw.I_ARROW;
    }

    private static String cap(String s) { return s.isEmpty() ? s : s.substring(0, 1).toUpperCase(Locale.ROOT) + s.substring(1); }

    public static void render(GuiGraphics g, int w, int h, int mx, int my) {
        Minecraft mc = Minecraft.getInstance();
        Canvas c = new Canvas(g, w, h);
        float vw = c.vw;

        c.begin();
        // soft shade behind the menu column (and a little over the whole game) so the text reads on any world
        c.d.rect(0, 0, Math.round(vw) + 1, 720, c.col(0x2605070B));
        float sx = colX - 90;
        for (int i = 0; i < 12; i++) c.d.rect(Math.round(sx + i * 7.5f), 0, Math.round(sx + i * 7.5f + 7.5f), 720, c.col(Draw.alpha(0xFF05070B, i * 10)));
        c.d.rect(Math.round(sx + 90), 0, Math.round(vw) + 1, 720, c.col(0x7805070B));
        c.end();

        // Your character, large, following the mouse.
        float mx1 = vw * 0.12f, mx2 = Math.min(vw * 0.56f, colX - 30);
        float centre = HEAD_TOP + 0.9f * MODEL;
        if (mc.player != null) {
            try {
                InventoryScreen.renderEntityInInventoryFollowsMouse(g, Math.round(mx1 * k), Math.round(60 * k), Math.round(mx2 * k),
                    Math.round((2 * centre - 60) * k), Math.round(MODEL * k), 0.0625f, mx, my, mc.player);
            } catch (Throwable ignored) {
                // another mod changed player rendering: just skip the model
            }
        }

        c.begin();
        c.brand();
        c.you(vw - 22);

        // Nametag above the character.
        if (mc.player != null) {
            String n = mc.player.getName().getString();
            float tw = c.tw(n, 12, true) + c.tw("You", 10, false) + 22, cx = (mx1 + mx2) / 2, ty = HEAD_TOP - 34;
            c.d.rounded(cx - tw / 2, ty, cx + tw / 2, ty + 21, 5, c.col(0xD90B0E16), c.col(Draw.alpha(Theme.accent(), 170)));
            c.txt(n, cx - tw / 2 + 8, ty + 10.5f, 12, 0xFFFFFFFF, true);
            c.txt("You", cx - tw / 2 + 14 + c.tw(n, 12, true), ty + 10.5f, 10, Theme.accent(), false);
        }

        // Where you are.
        boolean single = mc.getSingleplayerServer() != null;
        String place = single ? mc.getSingleplayerServer().getWorldData().getLevelName()
                : mc.getCurrentServer() != null ? mc.getCurrentServer().name : "Multiplayer";
        c.spaced(single ? "SINGLEPLAYER" : "MULTIPLAYER", colX, 180, 9, 1.2f, Canvas.MUTED, true);
        c.txt(Widgets.ellipsize(place, Math.round(colW * 8 / 18f)), colX, 203, 18, 0xFFFFFFFF, true);
        String sub;
        if (single) {
            String mode = mc.gameMode != null ? cap(mc.gameMode.getPlayerMode().getName()) : "";
            String diff = mc.level != null ? mc.level.getDifficulty().getDisplayName().getString() : "";
            sub = mode + (diff.isEmpty() ? "" : "  ·  " + diff);
        } else {
            int players = mc.getConnection() != null ? mc.getConnection().getOnlinePlayers().size() : 0;
            sub = (mc.getCurrentServer() != null ? mc.getCurrentServer().ip + "  ·  " : "") + players + (players == 1 ? " player" : " players");
        }
        c.txt(Widgets.ellipsize(sub, Math.round(colW * 8 / 11f)), colX, 225, 11, Canvas.MUTED, false);
        if (single) c.txt("Game paused", colX, 243, 10, Canvas.DIM, false);

        // Bottom left: how to open PandaClient, and performance.
        float x1 = 22, x2 = 292;
        c.card(x1, 587, x2, 648, 10);
        c.logo(x1 + 12, 603, 28);
        c.txt("PandaClient", x1 + 50, 609, 12, 0xFFFFFFFF, true);
        c.txt("Press " + Keys.name(Keys.MENU) + " for mods and settings", x1 + 50, 627, 10, Canvas.MUTED, false);
        c.fpsCard(x1, 657, x2, 695);

        // Footer
        Canvas.footer(c);
        c.end();
    }
}
