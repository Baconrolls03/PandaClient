package com.pandaclient.mod.gui;

import com.mojang.blaze3d.platform.InputConstants;
import com.pandaclient.mod.Keys;
import com.pandaclient.mod.PandaClientMod;
import com.pandaclient.mod.config.Config;
import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Modules;
import com.pandaclient.mod.module.Setting;
import com.pandaclient.mod.module.hud.HudModule;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.input.CharacterEvent;
import net.minecraft.client.input.KeyEvent;
import net.minecraft.client.input.MouseButtonEvent;
import net.minecraft.network.chat.Component;
import org.lwjgl.glfw.GLFW;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The PandaClient menu (Right Shift): categories on the left, a searchable grid of mod cards,
 * and a settings page for each mod.
 */
public final class MenuScreen extends Screen {
    private final Screen parent;
    private String category = "All";
    private String search = "";
    private boolean searchFocused;
    private Module open;
    private double scroll, scrollTarget;
    private int contentHeight;
    private long openedAt = System.currentTimeMillis();
    private final Map<Object, Float> anims = new HashMap<>();

    // settings page interaction
    private Setting.Num draggingNum;
    private int dragX, dragW;
    private Setting.Color editingColor;
    private int draggingColorBar = -1, colorBarX, colorBarW;
    private KeyMapping waitingKey;

    // layout (recomputed every frame)
    private int px, py, pw, ph;
    private static final int HEADER = 26, SIDEBAR = 84;
    private static final String[] CATEGORIES = {"All", "HUD", "PvP", "Visual", "Utility", "Mods"};

    public MenuScreen(Screen parent) {
        super(Component.literal("PandaClient"));
        this.parent = parent;
    }

    public static MenuScreen openAt(Screen parent, Module m) {
        MenuScreen s = new MenuScreen(parent);
        s.open = m;
        return s;
    }

    @Override public boolean isPauseScreen() { return false; }
    public Screen parentScreen() { return parent; }

    @Override public void onClose() {
        Config.save();
        minecraft.setScreen(parent);
    }

    // ------------------------------------------------------------------ layout helpers

    private void layout() {
        pw = Math.min(400, width - 24);
        ph = Math.min(240, height - 24);
        px = (width - pw) / 2;
        float t = Math.min(1f, (System.currentTimeMillis() - openedAt) / 160f);
        float ease = 1 - (1 - t) * (1 - t);
        py = (height - ph) / 2 + Math.round((1 - ease) * 10);
    }

    private float anim(Object key, boolean target) {
        float v = anims.getOrDefault(key, target ? 1f : 0f);
        v += ((target ? 1f : 0f) - v) * 0.3f;
        if (Math.abs(v - (target ? 1 : 0)) < 0.01f) v = target ? 1f : 0f;
        anims.put(key, v);
        return v;
    }

    private List<Module> visibleModules() {
        List<Module> l = new ArrayList<>();
        String q = search.toLowerCase(Locale.ROOT).trim();
        for (Module m : Modules.all()) {
            if (!category.equals("All") && !m.category.label.equals(category)) continue;
            if (!q.isEmpty() && !m.name.toLowerCase(Locale.ROOT).contains(q) && !m.description.toLowerCase(Locale.ROOT).contains(q)) continue;
            l.add(m);
        }
        return l;
    }

    private int contentX() { return px + SIDEBAR; }
    private int contentY() { return py + HEADER; }
    private int contentW() { return pw - SIDEBAR; }
    private int contentH() { return ph - HEADER; }

    // ------------------------------------------------------------------ render

    @Override
    public void renderBackground(GuiGraphics g, int mouseX, int mouseY, float delta) {
        g.fill(0, 0, width, height, 0x99000000);
    }

    @Override
    public void render(GuiGraphics g, int mx, int my, float delta) {
        super.render(g, mx, my, delta);
        layout();
        scroll += (scrollTarget - scroll) * 0.4;
        Draw d = new Draw(g);
        // panel
        d.round(px - 1, py - 1, px + pw + 1, py + ph + 1, Theme.BORDER);
        d.round(px, py, px + pw, py + ph, Theme.BG);
        drawHeader(d, mx, my);
        drawSidebar(d, mx, my);
        d.enableScissor(contentX(), contentY(), px + pw, py + ph);
        if (open == null) drawGrid(d, mx, my); else drawSettings(d, mx, my);
        d.disableScissor();
        // scrollbar
        int viewH = contentH() - 8;
        if (contentHeight > viewH) {
            int barH = Math.max(20, viewH * viewH / contentHeight);
            int barY = contentY() + 4 + (int) ((viewH - barH) * (scroll / Math.max(1, contentHeight - viewH)));
            d.round(px + pw - 4, barY, px + pw - 2, barY + barH, Theme.BORDER);
        }
    }

    private void drawHeader(Draw d, int mx, int my) {
        d.rect(px, py + HEADER - 1, px + pw, py + HEADER, Theme.BORDER);
        int x = d.text("PANDA", px + 10, py + 9, Theme.accent(), true);
        d.text("CLIENT", x + 1, py + 9, Theme.TEXT, true);

        // search box
        int sw = Math.min(130, pw - 200), sx = px + pw - sw - 6, sy = py + 5;
        boolean hover = Widgets.in(mx, my, sx, sy, sw, 16);
        d.round(sx, sy, sx + sw, sy + 16, searchFocused ? Theme.HOVER : hover ? Theme.RAISED : Theme.SURFACE);
        if (searchFocused) d.outline(sx, sy, sx + sw, sy + 16, Theme.accent());
        String shown = search.isEmpty() && !searchFocused ? "Search mods..." : search;
        String caret = searchFocused && (System.currentTimeMillis() / 500) % 2 == 0 ? "_" : "";
        d.text(Widgets.ellipsize(shown, sw - 14) + caret, sx + 6, sy + 4, search.isEmpty() && !searchFocused ? Theme.MUTED : Theme.TEXT, false);
    }

    private void drawSidebar(Draw d, int mx, int my) {
        int x = px, y = py + HEADER;
        d.rect(x + SIDEBAR - 1, y, x + SIDEBAR, py + ph, Theme.BORDER);
        int by = y + 8;
        for (String c : CATEGORIES) {
            boolean sel = c.equals(category) && open == null;
            boolean hover = Widgets.in(mx, my, x + 6, by, SIDEBAR - 13, 18);
            float a = anim("cat" + c, sel);
            if (a > 0 || hover) d.round(x + 6, by, x + SIDEBAR - 7, by + 18, sel ? Draw.alpha(Theme.accent(), (int) (40 * a)) : Theme.SURFACE);
            if (a > 0) d.rect(x + 6, by + 4, x + 8, by + 14, Draw.alpha(Theme.accent(), (int) (255 * a)));
            String label = c.equals("All") ? "All mods" : c;
            int count = 0;
            if (c.equals("Mods")) count = com.pandaclient.mod.util.BundledMods.list().size();
            else for (Module m : Modules.all()) if (c.equals("All") || m.category.label.equals(c)) count++;
            d.text(label, x + 13, by + 5, sel ? Theme.TEXT : Theme.MUTED, false);
            String n = String.valueOf(count);
            d.text(n, x + SIDEBAR - 12 - Draw.textWidth(n), by + 5, Theme.MUTED, false);
            by += 21;
        }
        // bottom buttons
        int bottom = py + ph - 8;
        int bw = SIDEBAR - 13;
        Widgets.button(d, x + 6, bottom - 18, bw, 18, "Edit HUD", Widgets.in(mx, my, x + 6, bottom - 18, bw, 18), true);
        String keyLabel = waitingKey == Keys.MENU ? "Press a key..." : "Menu: " + Keys.name(Keys.MENU);
        Widgets.button(d, x + 6, bottom - 40, bw, 18, Widgets.ellipsize(keyLabel, bw - 6), Widgets.in(mx, my, x + 6, bottom - 40, bw, 18), false);
        Widgets.button(d, x + 6, bottom - 62, bw, 18, "Accent: " + Modules.THEME.get(), Widgets.in(mx, my, x + 6, bottom - 62, bw, 18), false);
        Widgets.button(d, x + 6, bottom - 84, bw, 18, Widgets.ellipsize("Profile: " + Config.profile, bw - 6), Widgets.in(mx, my, x + 6, bottom - 84, bw, 18), false);
    }

    private int cols() { return contentW() >= 280 ? 2 : 1; }
    private static final int CARD_H = 26, GAP = 4;

    private void drawGrid(Draw d, int mx, int my) {
        if (category.equals("Mods")) { drawBundled(d, mx, my); return; }
        List<Module> mods = visibleModules();
        int cols = cols(), cx = contentX() + 8, cw = (contentW() - 16 - GAP * (cols - 1)) / cols;
        int y0 = contentY() + 8 - (int) Math.round(scroll);
        Module hovered = null;
        boolean inContent = Widgets.in(mx, my, contentX(), contentY(), contentW(), contentH());
        for (int i = 0; i < mods.size(); i++) {
            Module m = mods.get(i);
            int x = cx + (i % cols) * (cw + GAP), y = y0 + (i / cols) * (CARD_H + GAP);
            if (y > py + ph || y + CARD_H < contentY()) continue;
            boolean hover = inContent && Widgets.in(mx, my, x, y, cw, CARD_H);
            float on = anim(m, m.enabled());
            d.round(x, y, x + cw, y + CARD_H, hover ? Theme.RAISED : Theme.SURFACE);
            if (on > 0) d.rect(x, y + 6, x + 2, y + CARD_H - 6, Draw.alpha(Theme.accent(), (int) (255 * on)));
            d.text(Widgets.ellipsize(m.name, cw - 58), x + 8, y + 9, m.enabled() ? Theme.TEXT : Theme.MUTED, false);
            Widgets.toggle(d, x + cw - 26, y + 8, m.enabled(), on);
            if (!m.settings.isEmpty()) {
                boolean gh = Widgets.in(mx, my, x + cw - 44, y + 6, 14, 14);
                d.round(x + cw - 44, y + 6, x + cw - 30, y + 20, gh ? Theme.HOVER : Theme.RAISED);
                for (int k = 0; k < 3; k++) d.rect(x + cw - 41 + k * 3, y + 12, x + cw - 39 + k * 3, y + 14, Theme.TEXT);
            }
            if (hover) hovered = m;
        }
        if (hovered != null) {
            // description of the hovered mod, in a small bar at the bottom of the panel
            String desc = Widgets.ellipsize(hovered.description, pw - SIDEBAR - 16);
            d.rect(contentX(), py + ph - 16, px + pw, py + ph, 0xF00F141C);
            d.text(desc, contentX() + 8, py + ph - 12, Theme.MUTED, false);
        }
        if (mods.isEmpty()) d.centered("No mods match \"" + search + "\"", contentX() + contentW() / 2, contentY() + 40, Theme.MUTED, false);
        contentHeight = ((mods.size() + cols - 1) / cols) * (CARD_H + GAP) + 10;
    }

    // ------------------------------------------------------------------ bundled mods (Sodium, Sounds...)

    private List<com.pandaclient.mod.util.BundledMods.Entry> bundledVisible() {
        String q = search.toLowerCase(Locale.ROOT).trim();
        List<com.pandaclient.mod.util.BundledMods.Entry> l = new ArrayList<>();
        for (var e : com.pandaclient.mod.util.BundledMods.list()) if (q.isEmpty() || e.name().toLowerCase(Locale.ROOT).contains(q)) l.add(e);
        return l;
    }

    private void drawBundled(Draw d, int mx, int my) {
        var mods = bundledVisible();
        int cols = cols(), cx = contentX() + 8, cw = (contentW() - 16 - GAP * (cols - 1)) / cols;
        int y0 = contentY() + 8 - (int) Math.round(scroll);
        boolean inContent = Widgets.in(mx, my, contentX(), contentY(), contentW(), contentH());
        if (com.pandaclient.mod.util.BundledMods.restartNeeded()) {
            d.round(cx, y0, cx + contentW() - 16, y0 + 16, Draw.alpha(0xFFF5C451, 40));
            d.text("Restart Minecraft to apply your changes", cx + 6, y0 + 4, 0xFFF5C451, false);
            y0 += 20;
        }
        if (mods.isEmpty()) d.centered("Start Minecraft from the PandaClient launcher to get these mods", contentX() + contentW() / 2, contentY() + 40, Theme.MUTED, false);
        for (int i = 0; i < mods.size(); i++) {
            var e = mods.get(i);
            int x = cx + (i % cols) * (cw + GAP), y = y0 + (i / cols) * (CARD_H + GAP);
            if (y > py + ph || y + CARD_H < contentY()) continue;
            boolean on = com.pandaclient.mod.util.BundledMods.on(e);
            float a = anim("b" + e.slug(), on);
            d.round(x, y, x + cw, y + CARD_H, inContent && Widgets.in(mx, my, x, y, cw, CARD_H) ? Theme.RAISED : Theme.SURFACE);
            if (a > 0) d.rect(x, y + 6, x + 2, y + CARD_H - 6, Draw.alpha(Theme.accent(), (int) (255 * a)));
            var icon = com.pandaclient.mod.util.BundledMods.icon(e);
            if (icon != null) {
                int[] sz = com.pandaclient.mod.util.BundledMods.size(e);
                d.g.pose().pushMatrix();
                d.g.pose().translate(x + 6, y + 5);
                d.g.pose().scale(16f / sz[0], 16f / sz[1]);
                d.g.blit(net.minecraft.client.renderer.RenderPipelines.GUI_TEXTURED, icon, 0, 0, 0f, 0f, sz[0], sz[1], sz[0], sz[1]);
                d.g.pose().popMatrix();
            } else {
                d.round(x + 6, y + 5, x + 22, y + 21, Theme.RAISED);
                d.centered(e.name().substring(0, 1), x + 14, y + 9, Theme.accent(), false);
            }
            d.text(Widgets.ellipsize(e.name(), cw - 60), x + 27, y + 5, on ? Theme.TEXT : Theme.MUTED, false);
            d.push(); d.translate(x + 27, y + 16); d.scale(0.7f);
            d.text(e.category().toUpperCase(Locale.ROOT), 0, 0, Draw.alpha(Theme.accent(), 190), false);
            d.pop();
            Widgets.toggle(d, x + cw - 26, y + 8, on, a);
        }
        contentHeight = ((mods.size() + cols - 1) / cols) * (CARD_H + GAP) + 30;
    }

    private boolean clickBundled(double mx, double my) {
        var mods = bundledVisible();
        int cols = cols(), cx = contentX() + 8, cw = (contentW() - 16 - GAP * (cols - 1)) / cols;
        int y0 = contentY() + 8 - (int) Math.round(scroll) + (com.pandaclient.mod.util.BundledMods.restartNeeded() ? 20 : 0);
        for (int i = 0; i < mods.size(); i++) {
            int x = cx + (i % cols) * (cw + GAP), y = y0 + (i / cols) * (CARD_H + GAP);
            if (Widgets.in(mx, my, x, y, cw, CARD_H)) { com.pandaclient.mod.util.BundledMods.toggle(mods.get(i)); return true; }
        }
        return false;
    }

    // ------------------------------------------------------------------ settings page

    private static final int ROW = 24;

    private int settingRowsHeight(Module m) {
        int h = 0;
        for (Setting<?> s : m.settings) h += ROW + (s == editingColor ? 58 : 0);
        return h;
    }

    private void drawSettings(Draw d, int mx, int my) {
        Module m = open;
        int x = contentX() + 10, w = contentW() - 20;
        int y = contentY() + 8 - (int) Math.round(scroll);
        // header row
        boolean backHover = Widgets.in(mx, my, x, y, 44, 16);
        Widgets.button(d, x, y, 44, 16, "< Back", backHover, false);
        d.text(m.name, x + 52, y + 4, Theme.TEXT, false);
        float on = anim(m, m.enabled());
        Widgets.toggle(d, x + w - 20, y + 3, m.enabled(), on);
        boolean resetHover = Widgets.in(mx, my, x + w - 70, y, 44, 16);
        Widgets.button(d, x + w - 70, y, 44, 16, "Reset", resetHover, false);
        y += 22;
        d.push(); d.translate(x, y); d.scale(0.75f);
        for (String line : Widgets.wrap(m.description, (int) (w / 0.75f), 3)) { d.text(line, 0, 0, Theme.MUTED, false); d.translate(0, 10); }
        d.pop();
        y += 18;
        if (m instanceof HudModule) {
            boolean eh = Widgets.in(mx, my, x, y, 110, 16);
            Widgets.button(d, x, y, 110, 16, "Move in HUD editor", eh, false);
            y += 22;
        }
        if (m == Modules.ZOOM || m == Modules.FREELOOK) {
            KeyMapping k = m == Modules.ZOOM ? Keys.ZOOM : Keys.FREELOOK;
            d.round(x, y, x + w, y + ROW - 4, Theme.SURFACE);
            d.text("Key", x + 7, y + 6, Theme.TEXT, false);
            String label = waitingKey == k ? "Press a key..." : Keys.name(k);
            int bw = Math.max(50, Draw.textWidth(label) + 12);
            Widgets.button(d, x + w - bw - 4, y + 2, bw, 16, label, Widgets.in(mx, my, x + w - bw - 4, y + 2, bw, 16), waitingKey == k);
            y += ROW;
        }
        for (Setting<?> s : m.settings) {
            drawSetting(d, s, x, y, w, mx, my);
            y += ROW + (s == editingColor ? 58 : 0);
        }
        contentHeight = y + (int) Math.round(scroll) - contentY() + 8;
    }

    private void drawSetting(Draw d, Setting<?> s, int x, int y, int w, int mx, int my) {
        boolean hover = Widgets.in(mx, my, x, y, w, ROW - 4);
        d.round(x, y, x + w, y + ROW - 4 + (s == editingColor ? 58 : 0), hover ? Theme.RAISED : Theme.SURFACE);
        d.text(Widgets.ellipsize(s.name, w / 2 - 10), x + 7, y + 6, Theme.TEXT, false);
        int right = x + w - 6;
        if (s instanceof Setting.Bool b) {
            Widgets.toggle(d, right - 20, y + 5, b.on(), anim(b, b.on()));
        } else if (s instanceof Setting.Num n) {
            int bw = Math.min(140, w / 2 - 20), bx = right - bw - 34;
            double f = (n.get() - n.min) / (n.max - n.min);
            d.round(bx, y + 8, bx + bw, y + 12, Theme.OFF);
            d.round(bx, y + 8, bx + (int) Math.round(bw * f), y + 12, Theme.accent());
            int kx = bx + (int) Math.round(bw * f);
            d.round(kx - 3, y + 5, kx + 3, y + 15, 0xFFFFFFFF);
            String v = n.step >= 1 ? String.valueOf(n.asInt()) : String.format(Locale.ROOT, n.step >= 0.1 ? "%.1f" : "%.2f", n.get());
            d.text(v, right - Draw.textWidth(v), y + 6, Theme.MUTED, false);
        } else if (s instanceof Setting.Choice c) {
            int bw = Math.max(60, Draw.textWidth(c.get()) + 22);
            boolean bh = Widgets.in(mx, my, right - bw, y + 2, bw, 16);
            d.round(right - bw, y + 2, right, y + 18, bh ? Theme.HOVER : Theme.RAISED);
            d.text("<", right - bw + 4, y + 6, Theme.MUTED, false);
            d.text(">", right - 9, y + 6, Theme.MUTED, false);
            d.centered(c.get(), right - bw / 2, y + 6, Theme.TEXT, false);
        } else if (s instanceof Setting.Color c) {
            int sx = right - 30;
            d.round(sx - 1, y + 3, sx + 31, y + 17, Theme.BORDER);
            // checkerboard so transparency is visible
            for (int i = 0; i < 6; i++) d.rect(sx + i * 5, y + 4 + (i % 2) * 6, sx + i * 5 + 5, y + 10 + (i % 2) * 6, 0xFF8B98A9);
            d.rect(sx, y + 4, sx + 30, y + 16, c.argb());
            String hex = String.format("#%08X", c.get());
            d.text(c.chroma ? "Chroma" : hex, sx - 6 - Draw.textWidth(c.chroma ? "Chroma" : hex), y + 6, Theme.MUTED, false);
            if (s == editingColor) drawColorEditor(d, c, x + 7, y + ROW, w - 14, mx, my);
        }
    }

    private static final int[] PRESETS = {0xFFFFFFFF, 0xFF6EE08F, 0xFF4F8CFF, 0xFFA77BFF, 0xFFFF7BC5, 0xFFF26D6D, 0xFFFFA24F, 0xFFF5C451, 0xFF0F141C, 0x8C0F141C};

    private void drawColorEditor(Draw d, Setting.Color c, int x, int y, int w, int mx, int my) {
        float[] hsb = hsb(c.get());
        int alpha = c.get() >>> 24;
        int bw = w - 60;
        colorBarX = x + 50; colorBarW = bw;
        String[] labels = {"Hue", "Bright", "Opacity"};
        for (int i = 0; i < 3; i++) {
            int by = y + i * 12;
            d.text(labels[i], x, by + 1, Theme.MUTED, false);
            int steps = 32;
            for (int k = 0; k < steps; k++) {
                float f = k / (float) (steps - 1);
                int col = switch (i) {
                    case 0 -> 0xFF000000 | java.awt.Color.HSBtoRGB(f, 1f, 1f);
                    case 1 -> 0xFF000000 | java.awt.Color.HSBtoRGB(hsb[0], hsb[1], f);
                    default -> Draw.alpha(c.get(), (int) (f * 255));
                };
                int x1 = colorBarX + bw * k / steps, x2 = colorBarX + bw * (k + 1) / steps;
                d.rect(x1, by + 2, x2, by + 8, col);
            }
            float v = i == 0 ? hsb[0] : i == 1 ? hsb[2] : alpha / 255f;
            int kx = colorBarX + Math.round(bw * v);
            d.rect(kx - 1, by, kx + 1, by + 10, 0xFFFFFFFF);
        }
        int py2 = y + 38;
        for (int i = 0; i < PRESETS.length; i++) {
            int sx = x + i * 14;
            d.rect(sx, py2, sx + 11, py2 + 11, Theme.BORDER);
            d.rect(sx + 1, py2 + 1, sx + 10, py2 + 10, PRESETS[i]);
        }
        int cx = x + PRESETS.length * 14 + 10;
        d.text("Chroma", cx, py2 + 2, Theme.TEXT, false);
        Widgets.toggle(d, cx + Draw.textWidth("Chroma") + 6, py2 + 1, c.chroma, anim("chroma" + System.identityHashCode(c), c.chroma));
    }

    private static float[] hsb(int argb) {
        return java.awt.Color.RGBtoHSB((argb >> 16) & 255, (argb >> 8) & 255, argb & 255, null);
    }

    // ------------------------------------------------------------------ input

    @Override
    public boolean mouseClicked(MouseButtonEvent e, boolean doubleClick) {
        double mx = e.x(), my = e.y();
        int button = e.button();
        layout();
        waitingKey = null;
        // search
        int sw = Math.min(130, pw - 200), sx = px + pw - sw - 6, sy = py + 5;
        searchFocused = Widgets.in(mx, my, sx, sy, sw, 16);
        if (searchFocused) { open = null; return true; }
        // sidebar
        int by = py + HEADER + 8;
        for (String c : CATEGORIES) {
            if (Widgets.in(mx, my, px + 6, by, SIDEBAR - 13, 18)) {
                category = c; open = null; scrollTarget = scroll = 0; editingColor = null;
                return true;
            }
            by += 21;
        }
        int bottom = py + ph - 8, bw = SIDEBAR - 13;
        if (Widgets.in(mx, my, px + 6, bottom - 18, bw, 18)) { minecraft.setScreen(new HudEditorScreen(this)); return true; }
        if (Widgets.in(mx, my, px + 6, bottom - 40, bw, 18)) { waitingKey = Keys.MENU; return true; }
        if (Widgets.in(mx, my, px + 6, bottom - 62, bw, 18)) { Modules.THEME.cycle(button == 1 ? -1 : 1); Config.markDirty(); return true; }
        if (Widgets.in(mx, my, px + 6, bottom - 84, bw, 18)) {
            int i = java.util.Arrays.asList(Config.PROFILES).indexOf(Config.profile);
            Config.switchProfile(Config.PROFILES[Math.floorMod(i + (button == 1 ? -1 : 1), Config.PROFILES.length)]);
            return true;
        }
        if (!Widgets.in(mx, my, contentX(), contentY(), contentW(), contentH())) return super.mouseClicked(e, doubleClick);
        return open == null ? clickGrid(mx, my, button) : clickSettings(mx, my, button);
    }

    private boolean clickGrid(double mx, double my, int button) {
        if (category.equals("Mods")) return clickBundled(mx, my);
        List<Module> mods = visibleModules();
        int cols = cols(), cx = contentX() + 8, cw = (contentW() - 16 - GAP * (cols - 1)) / cols;
        int y0 = contentY() + 8 - (int) Math.round(scroll);
        for (int i = 0; i < mods.size(); i++) {
            Module m = mods.get(i);
            int x = cx + (i % cols) * (cw + GAP), y = y0 + (i / cols) * (CARD_H + GAP);
            if (!Widgets.in(mx, my, x, y, cw, CARD_H)) continue;
            boolean gear = !m.settings.isEmpty() && Widgets.in(mx, my, x + cw - 44, y + 6, 14, 14);
            if (gear || button == 1) openSettings(m);
            else { m.toggle(); Config.markDirty(); }
            return true;
        }
        return false;
    }

    private void openSettings(Module m) {
        open = m; scroll = scrollTarget = 0; editingColor = null; searchFocused = false;
    }

    private boolean clickSettings(double mx, double my, int button) {
        Module m = open;
        int x = contentX() + 10, w = contentW() - 20;
        int y = contentY() + 8 - (int) Math.round(scroll);
        if (Widgets.in(mx, my, x, y, 44, 16)) { open = null; scroll = scrollTarget = 0; editingColor = null; return true; }
        if (Widgets.in(mx, my, x + w - 20, y, 20, 16)) { m.toggle(); Config.markDirty(); return true; }
        if (Widgets.in(mx, my, x + w - 70, y, 44, 16)) {
            for (Setting<?> s : m.settings) { s.reset(); if (s instanceof Setting.Color c) c.chroma = false; }
            Config.markDirty();
            return true;
        }
        y += 40;
        if (m instanceof HudModule) {
            if (Widgets.in(mx, my, x, y, 110, 16)) { minecraft.setScreen(new HudEditorScreen(this)); return true; }
            y += 22;
        }
        if (m == Modules.ZOOM || m == Modules.FREELOOK) {
            if (Widgets.in(mx, my, x, y, w, ROW - 4)) { waitingKey = m == Modules.ZOOM ? Keys.ZOOM : Keys.FREELOOK; return true; }
            y += ROW;
        }
        int right = x + w - 6;
        for (Setting<?> s : m.settings) {
            int extra = s == editingColor ? 58 : 0;
            if (s == editingColor && Widgets.in(mx, my, x, y + ROW, w, 58)) {
                clickColorEditor((Setting.Color) s, mx, my, x + 7, y + ROW);
                return true;
            }
            if (Widgets.in(mx, my, x, y, w, ROW - 4)) {
                if (s instanceof Setting.Bool b) b.toggle();
                else if (s instanceof Setting.Choice c) {
                    int bw = Math.max(60, Draw.textWidth(c.get()) + 22);
                    c.cycle(button == 1 || (mx >= right - bw && mx < right - bw / 2) ? -1 : 1);
                }
                else if (s instanceof Setting.Num n) {
                    int bw = Math.min(140, w / 2 - 20), bx = right - bw - 34;
                    draggingNum = n; dragX = bx; dragW = bw;
                    setNum(mx);
                } else if (s instanceof Setting.Color c) editingColor = editingColor == c ? null : c;
                Config.markDirty();
                return true;
            }
            y += ROW + extra;
        }
        return false;
    }

    private void clickColorEditor(Setting.Color c, double mx, double my, int x, int y) {
        for (int i = 0; i < 3; i++) {
            if (my >= y + i * 12 && my < y + i * 12 + 11 && mx >= colorBarX - 4 && mx <= colorBarX + colorBarW + 4) {
                draggingColorBar = i;
                setColorBar(c, mx);
                return;
            }
        }
        int py2 = y + 38;
        for (int i = 0; i < PRESETS.length; i++) {
            if (Widgets.in(mx, my, x + i * 14, py2, 11, 11)) { c.set(PRESETS[i]); c.chroma = false; Config.markDirty(); return; }
        }
        int cx = x + PRESETS.length * 14 + 10;
        if (Widgets.in(mx, my, cx, py2 - 2, Draw.textWidth("Chroma") + 30, 14)) { c.chroma = !c.chroma; Config.markDirty(); }
    }

    private void setColorBar(Setting.Color c, double mx) {
        float f = (float) Math.max(0, Math.min(1, (mx - colorBarX) / colorBarW));
        float[] hsb = hsb(c.get());
        int a = c.get() >>> 24;
        int rgb;
        switch (draggingColorBar) {
            case 0 -> { rgb = java.awt.Color.HSBtoRGB(f, hsb[1] < 0.05f ? 0.8f : hsb[1], hsb[2] < 0.05f ? 1f : hsb[2]); c.set((a << 24) | (rgb & 0xFFFFFF)); }
            case 1 -> { rgb = java.awt.Color.HSBtoRGB(hsb[0], hsb[1], f); c.set((a << 24) | (rgb & 0xFFFFFF)); }
            default -> c.set(Draw.alpha(c.get(), Math.round(f * 255)));
        }
        Config.markDirty();
    }

    private void setNum(double mx) {
        double f = Math.max(0, Math.min(1, (mx - dragX) / dragW));
        draggingNum.set(draggingNum.min + (draggingNum.max - draggingNum.min) * f);
        Config.markDirty();
    }

    @Override
    public boolean mouseDragged(MouseButtonEvent e, double dx, double dy) {
        if (draggingNum != null) { setNum(e.x()); return true; }
        if (draggingColorBar >= 0 && editingColor != null) { setColorBar(editingColor, e.x()); return true; }
        return super.mouseDragged(e, dx, dy);
    }

    @Override
    public boolean mouseReleased(MouseButtonEvent e) {
        draggingNum = null; draggingColorBar = -1;
        return super.mouseReleased(e);
    }

    @Override
    public boolean mouseScrolled(double mx, double my, double sx, double sy) {
        int max = Math.max(0, contentHeight - (contentH() - 8));
        scrollTarget = Math.max(0, Math.min(max, scrollTarget - sy * 24));
        return true;
    }

    @Override
    public boolean keyPressed(KeyEvent e) {
        int key = e.key();
        if (waitingKey != null) {
            waitingKey.setKey(key == GLFW.GLFW_KEY_ESCAPE ? InputConstants.UNKNOWN : InputConstants.getKey(e));
            KeyMapping.resetMapping();
            minecraft.options.save();
            waitingKey = null;
            return true;
        }
        if (key == GLFW.GLFW_KEY_ESCAPE) {
            if (searchFocused) { searchFocused = false; return true; }
            if (open != null) { open = null; editingColor = null; scroll = scrollTarget = 0; return true; }
            onClose();
            return true;
        }
        if (Keys.MENU.matches(e) && !searchFocused) { onClose(); return true; }
        if (searchFocused || open == null) {
            if (key == GLFW.GLFW_KEY_BACKSPACE && !search.isEmpty()) { search = search.substring(0, search.length() - 1); searchFocused = true; scrollTarget = 0; return true; }
            if (key == GLFW.GLFW_KEY_ENTER && searchFocused) {
                List<Module> v = visibleModules();
                if (v.size() == 1) openSettings(v.get(0));
                return true;
            }
        }
        return super.keyPressed(e);
    }

    @Override
    public boolean charTyped(CharacterEvent e) {
        if (open == null || searchFocused) {
            String s = e.codepointAsString();
            if (s.isBlank() && search.isEmpty()) return false;
            if (search.length() < 32) { search += s; searchFocused = true; open = null; scrollTarget = scroll = 0; }
            return true;
        }
        return super.charTyped(e);
    }
}
