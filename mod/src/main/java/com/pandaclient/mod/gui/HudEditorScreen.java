package com.pandaclient.mod.gui;

import com.pandaclient.mod.config.Config;
import com.pandaclient.mod.module.Modules;
import com.pandaclient.mod.module.hud.HudModule;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.input.KeyEvent;
import net.minecraft.client.input.MouseButtonEvent;
import net.minecraft.network.chat.Component;
import org.lwjgl.glfw.GLFW;

import java.util.ArrayList;
import java.util.List;

/**
 * Drag HUD mods around (they snap to the screen edges, the centre and each other),
 * scroll over one to resize it, right-click to open its settings.
 */
public final class HudEditorScreen extends Screen {
    private static final int SNAP = 5;
    private final Screen parent;
    private HudModule dragging, resizing;
    private double grabX, grabY;
    private double resizeStartW;
    private double resizeStartScale;
    private int resizeX, resizeY;
    private static final int HANDLE = 5;
    private String note = "";
    private long noteAt;

    /** The little square at an element's bottom-right corner: drag it to resize. */
    private boolean onHandle(HudModule m, double mx, double my) {
        int x2 = m.x(width) + Math.max(8, m.scaledW()), y2 = m.y(height) + Math.max(8, m.scaledH());
        return mx >= x2 - HANDLE && mx <= x2 + 3 && my >= y2 - HANDLE && my <= y2 + 3;
    }
    private Integer guideX, guideY;

    public HudEditorScreen(Screen parent) {
        super(Component.literal("PandaClient HUD editor"));
        this.parent = parent;
    }

    @Override public boolean isPauseScreen() { return false; }

    @Override public void onClose() {
        HudModule.editing = false;
        Config.save();
        minecraft.setScreen(parent);
    }

    @Override protected void init() { HudModule.editing = true; }
    @Override public void removed() { HudModule.editing = false; }

    private List<HudModule> shown() {
        List<HudModule> l = new ArrayList<>();
        for (HudModule m : Modules.hud()) if (m.enabled()) l.add(m);
        return l;
    }

    private HudModule at(double mx, double my) {
        List<HudModule> l = shown();
        for (int i = l.size() - 1; i >= 0; i--) {
            HudModule m = l.get(i);
            if (Widgets.in(mx, my, m.x(width), m.y(height), Math.max(8, m.scaledW()), Math.max(8, m.scaledH()))) return m;
        }
        return null;
    }

    @Override
    public void renderBackground(GuiGraphics g, int mouseX, int mouseY, float delta) {
        // Not in a world: show what the game looks like (the view from where you last played, a hotbar,
        // hearts and hunger) so you can place your HUD against it.
        if (minecraft.level == null) { HudPreview.draw(minecraft, g, width, height); return; }
        g.fill(0, 0, width, height, 0x55000000);
    }

    @Override
    public void render(GuiGraphics g, int mx, int my, float delta) {
        super.render(g, mx, my, delta);
        HudModule.editing = true;
        Draw d = new Draw(g);
        int accent = Theme.accent();
        // centre lines
        d.rect(width / 2, 0, width / 2 + 1, height, 0x22FFFFFF);
        d.rect(0, height / 2, width, height / 2 + 1, 0x22FFFFFF);
        if (guideX != null) d.rect(guideX, 0, guideX + 1, height, Draw.alpha(accent, 200));
        if (guideY != null) d.rect(0, guideY, width, guideY + 1, Draw.alpha(accent, 200));

        HudModule hover = resizing != null ? resizing : dragging != null ? dragging : at(mx, my);
        for (HudModule m : shown()) {
            int x = m.x(width), y = m.y(height), w = Math.max(8, m.scaledW()), h = Math.max(8, m.scaledH());
            boolean hl = m == hover;
            d.rect(x - 2, y - 2, x + w + 2, y + h + 2, hl ? Draw.alpha(accent, 40) : 0x18FFFFFF);
            d.outline(x - 2, y - 2, x + w + 2, y + h + 2, hl ? accent : 0x40FFFFFF);
            Draw.hud = true;
            try { m.draw(d, width, height, true); } finally { Draw.hud = false; }
            if (hl) {
                // resize handle
                d.rect(x + w - 2, y + h - 2, x + w + 3, y + h + 3, 0xFF0F141C);
                d.rect(x + w - 1, y + h - 1, x + w + 2, y + h + 2, accent);
            }
            if (hl) {
                String label = m.name + "  " + Math.round(m.scale.get() * 100) + "%";
                int ly = y - 13 < 0 ? y + h + 4 : y - 13;
                int lx = Math.max(0, Math.min(width - Draw.textWidth(label) - 6, x));
                d.round(lx, ly, lx + Draw.textWidth(label) + 6, ly + 11, 0xE00F141C);
                d.text(label, lx + 3, ly + 2, Theme.TEXT, false);
            }
        }

        // toolbar
        String[] tools = {"Reset all", "Copy layout", "Paste layout"};
        int tx = width / 2 - 123;
        for (int i = 0; i < tools.length; i++) Widgets.button(d, tx + i * 84, 4, 78, 16, tools[i], Widgets.in(mx, my, tx + i * 84, 4, 78, 16), false);
        if (System.currentTimeMillis() - noteAt < 2500) d.centered(note, width / 2, 24, Theme.accent(), true);

        // help bar
        String help = "Drag to move  •  Drag the corner to resize  •  Right-click: settings  •  Middle-click: reset  •  Esc: back";
        int hw = Draw.textWidth(help) + 16;
        int hx = (width - hw) / 2, hy = height - 22;
        if (hw > width - 8) { help = "Drag • Scroll to resize • Right-click: settings"; hw = Draw.textWidth(help) + 16; hx = (width - hw) / 2; }
        d.round(hx, hy, hx + hw, hy + 16, 0xE00F141C);
        d.text(help, hx + 8, hy + 4, Theme.MUTED, false);
        // done button
        int bx = width / 2 - 40, by = height / 2 - 9;
        if (dragging == null && at(mx, my) == null) {
            Widgets.button(d, bx, by, 80, 18, "Open menu", Widgets.in(mx, my, bx, by, 80, 18), true);
        }
    }

    @Override
    public boolean mouseClicked(MouseButtonEvent e, boolean doubleClick) {
        double mx = e.x(), my = e.y();
        int tx = width / 2 - 123;
        for (int i = 0; i < 3; i++) {
            if (!Widgets.in(mx, my, tx + i * 84, 4, 78, 16)) continue;
            switch (i) {
                case 0 -> { for (HudModule h : Modules.hud()) h.resetPosition(); Config.markDirty(); note = "Layout reset"; }
                case 1 -> { minecraft.keyboardHandler.setClipboard(Config.exportString()); note = "Copied! Paste it to a friend"; }
                default -> note = Config.importString(minecraft.keyboardHandler.getClipboard()) ? "Layout pasted" : "No PandaClient layout on the clipboard";
            }
            noteAt = System.currentTimeMillis();
            return true;
        }
        if (e.button() == 2) { // middle click: reset that element
            HudModule h = at(mx, my);
            if (h != null) { h.resetPosition(); Config.markDirty(); return true; }
        }
        for (HudModule h : shown()) {
            if (e.button() == 0 && onHandle(h, mx, my)) {
                resizing = h; resizeStartW = Math.max(8, h.scaledW()); resizeStartScale = h.scale.get();
                resizeX = h.x(width); resizeY = h.y(height);
                return true;
            }
        }
        HudModule m = at(mx, my);
        if (m == null) {
            if (Widgets.in(mx, my, width / 2 - 40, height / 2 - 9, 80, 18)) {
                HudModule.editing = false;
                minecraft.setScreen(parent instanceof MenuScreen ? parent : new MenuScreen(null));
                return true;
            }
            return super.mouseClicked(e, doubleClick);
        }
        if (e.button() == 1) {
            HudModule.editing = false;
            minecraft.setScreen(MenuScreen.openAt(parent instanceof MenuScreen p ? p.parentScreen() : parent, m));
            return true;
        }
        dragging = m;
        grabX = mx - m.x(width);
        grabY = my - m.y(height);
        return true;
    }

    @Override
    public boolean mouseDragged(MouseButtonEvent e, double dx, double dy) {
        if (resizing != null) {
            double newW = Math.max(10, e.x() - resizeX);
            resizing.scale.set(resizeStartScale * newW / resizeStartW);
            resizing.moveTo(resizeX, resizeY, width, height);
            Config.markDirty();
            return true;
        }
        if (dragging == null) return super.mouseDragged(e, dx, dy);
        int w = dragging.scaledW(), h = dragging.scaledH();
        int x = (int) Math.round(e.x() - grabX), y = (int) Math.round(e.y() - grabY);
        guideX = null; guideY = null;
        boolean snap = (e.modifiers() & GLFW.GLFW_MOD_SHIFT) == 0;
        if (snap) {
            // candidate edges: screen edges + centre, and every other element's edges
            List<int[]> xs = new ArrayList<>(), ys = new ArrayList<>();
            xs.add(new int[]{0, 0}); xs.add(new int[]{width - w, width}); xs.add(new int[]{width / 2 - w / 2, width / 2});
            ys.add(new int[]{0, 0}); ys.add(new int[]{height - h, height}); ys.add(new int[]{height / 2 - h / 2, height / 2});
            for (HudModule o : shown()) {
                if (o == dragging) continue;
                int ox = o.x(width), oy = o.y(height), ow = o.scaledW(), oh = o.scaledH();
                xs.add(new int[]{ox, ox}); xs.add(new int[]{ox + ow - w, ox + ow}); xs.add(new int[]{ox + ow + 2, ox + ow}); xs.add(new int[]{ox - w - 2, ox});
                ys.add(new int[]{oy, oy}); ys.add(new int[]{oy + oh - h, oy + oh}); ys.add(new int[]{oy + oh + 2, oy + oh}); ys.add(new int[]{oy - h - 2, oy});
            }
            int best = SNAP + 1;
            for (int[] c : xs) { int dist = Math.abs(c[0] - x); if (dist < best) { best = dist; guideX = c[1]; x = c[0]; } }
            best = SNAP + 1;
            int yy = y;
            for (int[] c : ys) { int dist = Math.abs(c[0] - yy); if (dist < best) { best = dist; guideY = c[1]; y = c[0]; } }
        }
        x = Math.max(0, Math.min(width - w, x));
        y = Math.max(0, Math.min(height - h, y));
        dragging.moveTo(x, y, width, height);
        Config.markDirty();
        return true;
    }

    @Override
    public boolean mouseReleased(MouseButtonEvent e) {
        dragging = null; resizing = null; guideX = null; guideY = null;
        return super.mouseReleased(e);
    }

    @Override
    public boolean mouseScrolled(double mx, double my, double sx, double sy) {
        HudModule m = dragging != null ? dragging : at(mx, my);
        if (m == null) return false;
        int cx = m.x(width) + m.scaledW() / 2, cy = m.y(height) + m.scaledH() / 2;
        m.scale.set(m.scale.get() + (sy > 0 ? 0.05 : -0.05));
        m.moveTo(cx - m.scaledW() / 2, cy - m.scaledH() / 2, width, height);
        Config.markDirty();
        return true;
    }

    @Override
    public boolean keyPressed(KeyEvent e) {
        if (e.key() == GLFW.GLFW_KEY_ESCAPE) { onClose(); return true; }
        return super.keyPressed(e);
    }
}
