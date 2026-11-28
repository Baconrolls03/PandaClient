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

    private static final float HEAD_TOP = 190, MODEL = 330;
    /** Canvas y of the top of the button column (the header sits above it). */
    private static float listTop = 262;

    // what apply() found, kept so "More..." can re-lay the menu out
    private static AbstractWidget back, leave, moreButton;
    private static final List<AbstractWidget> main = new ArrayList<>(), extra = new ArrayList<>(), icons = new ArrayList<>();
    private static boolean expanded;
    /** Essential buttons drawn on wooden tiles. */
    private static final List<AbstractWidget> iconTiles = new ArrayList<>();
    private static int screenW, screenH;

    /** Buttons people use; the rest go behind "More...". */
    private static boolean isMain(AbstractWidget b) {
        String s = b.getMessage().getString().toLowerCase(Locale.ROOT);
        return s.contains("option") || s.contains("advancement") || s.contains("statistic");
    }

    /**
     * A short, tidy menu: Back to Game, then pairs of buttons (Options, PandaClient Mods, Advancements,
     * Statistics, Edit HUD, More...), then Disconnect. Everything else (reporting, feedback, server links,
     * other mods' buttons) is behind More... Small icon buttons keep their size in a row underneath.
     */
    public static void apply(List<AbstractWidget> buttons, List<AbstractWidget> ours, AbstractWidget more, int w, int h) {
        List<AbstractWidget> list = new ArrayList<>();
        main.clear(); extra.clear(); icons.clear();
        for (AbstractWidget b : buttons) {
            if (ours.contains(b) || b == more || !b.visible) continue;
            if (b instanceof net.minecraft.client.gui.components.AbstractButton) (b.getWidth() < 90 ? icons : list).add(b);
            else if (b instanceof net.minecraft.client.gui.components.StringWidget) b.visible = false; // the "Game Menu" title: our header replaces it
        }
        if (list.isEmpty()) return;
        java.util.Comparator<AbstractWidget> order = Comparator.comparingInt(AbstractWidget::getY).thenComparingInt(AbstractWidget::getX);
        list.sort(order);
        icons.sort(order);
        // find Back to Game and Disconnect by name (other mods can add buttons above or below them)
        back = find(list, "menu.returnToGame");
        leave = find(list, "menu.disconnect");
        if (leave == null) leave = find(list, "menu.returnToMenu");
        if (back == null) back = list.get(0);
        if (leave == null && list.size() > 1) leave = list.get(list.size() - 1);
        if (leave == back) leave = null;
        for (AbstractWidget b : list) if (b != back && b != leave) (isMain(b) ? main : extra).add(b);
        // Essential's small buttons: only Invite, Social and Pictures under Disconnect; the rest behind More...
        List<AbstractWidget> keep = new ArrayList<>();
        for (AbstractWidget b : icons) if (wanted(b)) keep.add(b);
        if (!keep.isEmpty()) {
            for (AbstractWidget b : icons) if (!keep.contains(b)) extra.add(b);
            icons.clear();
            icons.addAll(keep);
        }
        // order: Options, PandaClient Mods, Advancements, Statistics, Edit HUD
        main.sort(Comparator.comparingInt(b -> { String s = b.getMessage().getString().toLowerCase(Locale.ROOT); return s.contains("option") ? 0 : s.contains("advancement") ? 2 : 3; }));
        if (!ours.isEmpty()) main.add(Math.min(1, main.size()), ours.get(0));
        for (int i = 1; i < ours.size(); i++) main.add(ours.get(i));
        moreButton = more;
        expanded = false;
        screenW = w; screenH = h;
        layout();
    }

    private static AbstractWidget find(List<AbstractWidget> list, String key) {
        String label = net.minecraft.network.chat.Component.translatable(key).getString();
        for (AbstractWidget b : list) if (b.getMessage().getString().equals(label)) return b;
        return null;
    }

    /** Text of a small button: its label, or its tooltip/narration when it only shows an icon. */
    private static String words(AbstractWidget b) {
        StringBuilder t = new StringBuilder(b.getMessage().getString());
        try {
            var n = new net.minecraft.client.gui.narration.NarrationElementOutput() {
                public void add(net.minecraft.client.gui.narration.NarratedElementType type, net.minecraft.client.gui.narration.NarrationThunk<?> thunk) {
                    t.append(' ').append(thunk.getText());
                }
                public net.minecraft.client.gui.narration.NarrationElementOutput nest() { return this; }
            };
            b.updateNarration(n);
        } catch (Throwable ignored) {}
        return t.toString().toLowerCase(Locale.ROOT);
    }

    private static boolean wanted(AbstractWidget b) {
        String s = words(b);
        return s.contains("invite") || s.contains("social") || s.contains("friend") || s.contains("picture")
            || s.contains("screenshot") || s.contains("gallery");
    }

    /** Show or hide the less-used buttons. */
    public static void toggleMore() {
        expanded = !expanded;
        layout();
    }

    private static void layout() {
        int w = screenW, h = screenH;
        k = Canvas.scaleFor(h);
        List<AbstractWidget> half = new ArrayList<>(main);
        if (moreButton != null && !extra.isEmpty()) {
            moreButton.visible = true;
            moreButton.setMessage(net.minecraft.network.chat.Component.literal(expanded ? "Less" : "More..."));
            half.add(moreButton);
        } else if (moreButton != null) moreButton.visible = false;
        if (expanded) for (AbstractWidget b : extra) if (!(b.getWidth() < 90 && b.getHeight() <= 24)) half.add(b);
        for (AbstractWidget b : extra) b.visible = expanded;
        for (AbstractWidget b : icons) b.visible = true; // Essential's and servers' icon buttons: always shown

        int cw = Math.min(204, Math.max(150, w / 3)), x = w - cw - Math.max(16, Math.round(w * 0.06f));
        int pairs = (half.size() + 1) / 2;
        int row = 20, gap = 4, first = 24, iconsH = !icons.isEmpty() ? 26 : 0;
        int top = Math.max(Math.round(110 * k), 36), bottom = h - Math.max(10, Math.round(40 * k));
        int rows = pairs + (leave != null ? 1 : 0);
        while (first + 6 + rows * (row + gap) + iconsH > bottom - top && (row > 14 || gap > 2)) {
            if (gap > 2) gap--; else row--;
            first = Math.max(row, Math.min(24, row + 4));
        }
        int total = first + 6 + rows * (row + gap) + iconsH;
        int y = Math.max(top, Math.min((h - total) / 2 + Math.round(30 * k), bottom - total));
        listTop = y / k;
        colX = x / k;
        colW = cw / k;
        PauseLayout.rows.clear();

        place(back, x, y, cw, first);
        y += first + 6;
        int hw = (cw - gap) / 2;
        for (int i = 0; i < half.size(); i++) {
            AbstractWidget b = half.get(i);
            boolean alone = i == half.size() - 1 && half.size() % 2 == 1;
            place(b, alone ? x : x + (i % 2) * (hw + gap), y, alone ? cw : hw, row);
            PauseLayout.rows.add(b);
            if (i % 2 == 1 || alone) y += row + gap;
        }
        if (leave != null) { place(leave, x, y, cw, row); y += row + gap; }
        {
            // small square wooden buttons, centred under Disconnect
            int size = Math.max(16, Math.min(20, row)), step = size + 6;
            int ix = x + (cw - (icons.size() * step - 6)) / 2;
            y += 4;
            iconTiles.clear();
            for (AbstractWidget b : icons) {
                place(b, ix, y, size, size);
                iconTiles.add(b);
                ix += step;
            }
            // Essential's other small buttons (shown with More...) go in a row under those
            y += size + 6;
            int ex = x;
            for (AbstractWidget b : extra) if (b.getWidth() < 90 && b.getHeight() <= 24) {
                b.setX(ex); b.setY(y);
                ex += b.getWidth() + 4;
                if (ex > x + cw) { ex = x; y += b.getHeight() + 4; }
            }
        }
        primary = back;
        danger = leave;
    }

    private static void place(AbstractWidget b, int x, int y, int w, int h) {
        b.setX(x); b.setY(y); b.setWidth(w); b.setHeight(h);
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

    /** Soft shade behind the menu column (drawn before the buttons) so the text reads on any world. */
    public static void renderShade(GuiGraphics g, int w, int h) {
        Canvas c = new Canvas(g, w, h);
        float vw = c.vw;
        c.begin();
        c.d.rect(0, 0, Math.round(vw) + 1, 720, 0x2605070B);
        float sx = colX - 90;
        for (int i = 0; i < 12; i++) c.d.rect(Math.round(sx + i * 7.5f), 0, Math.round(sx + i * 7.5f + 7.5f), 720, Draw.alpha(0xFF05070B, i * 10));
        c.d.rect(Math.round(sx + 90), 0, Math.round(vw) + 1, 720, 0x7805070B);
        c.end();
        // wooden tiles under Essential's icon buttons, so they match the other buttons
        for (AbstractWidget b : iconTiles) {
            if (!b.visible) continue;
            int bx = b.getX() - 2, by = b.getY() - 2;
            ButtonStyle.woodTile(g, bx, by, b.getWidth() + 4, b.getHeight() + 4, b.isHovered());
        }
    }

    public static void render(GuiGraphics g, int w, int h, int mx, int my) {
        Minecraft mc = Minecraft.getInstance();
        Canvas c = new Canvas(g, w, h);
        float vw = c.vw;


        // Your character (your skin only, like the lobby: no held items), looking towards the mouse.
        float mx1 = vw * 0.12f, mx2 = Math.min(vw * 0.56f, colX - 30);
        float cx0 = (mx1 + mx2) / 2, H = MODEL, cy = HEAD_TOP + H / 2;
        boolean drawn = false;
        if (mc.player != null) {
            float mcx = mx / k, mcy = my / k;
            float look = Math.max(-0.6f, Math.min(0.6f, -(mcx - cx0) / vw * 1.8f));
            float pitch = Math.max(-0.45f, Math.min(0.5f, (mcy - (cy - H * 0.4f)) / 720f * 1.4f));
            float yaw = -12 - (mcx / vw - 0.5f) * 16;
            float box = H * 1.7f;
            drawn = LobbyPlayer.draw(mc, g, "pause", null, mc.player.getName().getString(),
                Math.round((cx0 - box / 2) * k), Math.round((cy - H * 1.25f) * k), Math.round((cx0 + box / 2) * k), Math.round((cy + H * 0.53f) * k),
                H * k, yaw, new LobbyPlayer.Pose(0, 0, 0, System.currentTimeMillis() / 1000f, look, pitch));
            if (!drawn) {
                try {
                    int size = Math.round(H * 0.42f * k);
                    int top = Math.round(HEAD_TOP * k), bot = Math.round((HEAD_TOP + H) * k);
                    InventoryScreen.renderEntityInInventoryFollowsMouse(g, Math.round(mx1 * k), top, Math.round(mx2 * k), bot,
                        size, 0.0625f, mx, my, mc.player);
                } catch (Throwable ignored) {
                    // another mod changed player rendering: just skip the model
                }
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
        float hy = listTop - 82;
        c.spaced(single ? "SINGLEPLAYER" : "MULTIPLAYER", colX, hy, 9, 1.2f, Canvas.MUTED, true);
        c.txt(Widgets.ellipsize(place, Math.round(colW * 8 / 18f)), colX, hy + 23, 18, 0xFFFFFFFF, true);
        String sub;
        if (single) {
            String mode = mc.gameMode != null ? cap(mc.gameMode.getPlayerMode().getName()) : "";
            String diff = mc.level != null ? mc.level.getDifficulty().getDisplayName().getString() : "";
            sub = mode + (diff.isEmpty() ? "" : "  ·  " + diff);
        } else {
            int players = mc.getConnection() != null ? mc.getConnection().getOnlinePlayers().size() : 0;
            sub = (mc.getCurrentServer() != null ? mc.getCurrentServer().ip + "  ·  " : "") + players + (players == 1 ? " player" : " players");
        }
        c.txt(Widgets.ellipsize(sub, Math.round(colW * 8 / 11f)), colX, hy + 45, 11, Canvas.MUTED, false);
        if (single) c.txt("Game paused", colX, hy + 63, 10, Canvas.DIM, false);

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
