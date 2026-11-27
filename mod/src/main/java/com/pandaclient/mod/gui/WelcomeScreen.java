package com.pandaclient.mod.gui;

import com.pandaclient.mod.config.Config;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Modules;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.input.MouseButtonEvent;
import net.minecraft.client.renderer.RenderPipelines;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;

import java.nio.file.Files;
import java.nio.file.Path;

/** First time in game: a few quick choices in a frosted panel beside your character (like OneClient's setup). */
public final class WelcomeScreen extends Screen {
    private record Step(String kicker, String title, String text, String[] options, String[] notes) {}

    private static final Step[] STEPS = {
        new Step("Welcome to", "PANDACLIENT", "A few quick choices and you're ready to play. You can change all of them later from the PandaClient menu.", new String[]{"Let's go"}, null),
        new Step("Let's configure the", "Look & Feel", "Pick how the buttons in every menu look.", new String[]{"PandaClient", "Minecraft"},
            new String[]{"Smooth, rounded and modern", "Blocky, like the vanilla menus"}),
        new Step("Continuing with", "Menu Font", "The font PandaClient's menus use.", new String[]{"Smooth", "Minecraft"}, null),
        new Step("Continuing with", "Toggle Sprint", "Sprint stays on after you let go of the key.", new String[]{"Enabled", "Disabled"}, null),
        new Step("Continuing with", "PvP HUD", "FPS, CPS and keystrokes on screen. Move them any time in Edit HUD.", new String[]{"Show", "Hide"}, null),
        new Step("One last thing", "Fullbright", "See clearly in caves and at night.", new String[]{"On", "Off"}, null),
    };
    private static final Identifier BG = Identifier.fromNamespaceAndPath("pandaclient", "textures/gui/title_background.png");

    private final Screen next;
    private int step;
    private final long start = System.currentTimeMillis();
    private AbstractWidget player;

    public WelcomeScreen(Screen next) {
        super(Component.literal("Welcome to PandaClient"));
        this.next = next;
    }

    private static Path marker() { return FabricLoader.getInstance().getConfigDir().resolve("pandaclient-welcome-done"); }
    public static boolean done() { return Files.exists(marker()); }

    @Override public boolean shouldCloseOnEsc() { return false; }
    @Override protected void init() { player = null; }

    private int choice(int s) {
        return switch (s) {
            case 1 -> Modules.TITLE_SCREEN.buttons.is("PandaClient") ? 0 : 1;
            case 2 -> Modules.TITLE_SCREEN.smoothFont.on() ? 0 : 1;
            case 3 -> Modules.TOGGLE_SPRINT.enabled() ? 0 : 1;
            case 4 -> Modules.FPS.enabled() && Modules.KEYSTROKES.enabled() ? 0 : 1;
            case 5 -> Modules.FULLBRIGHT.enabled() ? 0 : 1;
            default -> 0;
        };
    }

    private void pick(int s, int i) {
        switch (s) {
            case 1 -> Modules.TITLE_SCREEN.buttons.set(i == 0 ? "PandaClient" : "Minecraft");
            case 2 -> Modules.TITLE_SCREEN.smoothFont.set(i == 0);
            case 3 -> Modules.TOGGLE_SPRINT.setEnabled(i == 0);
            case 4 -> { for (Module m : new Module[]{Modules.FPS, Modules.CPS, Modules.KEYSTROKES}) m.setEnabled(i == 0); }
            case 5 -> Modules.FULLBRIGHT.setEnabled(i == 0);
            default -> {}
        }
        Config.markDirty();
    }

    private void finish() {
        try { Files.writeString(marker(), "done"); } catch (Exception ignored) {}
        Config.save();
        minecraft.setScreen(next);
    }

    // ---------------------------------------------------------------- layout (canvas units, 720 tall)

    private float k() { return height / 720f; }
    private float vw() { return width / k(); }
    private float[] panel() {
        float w = Math.min(580, vw() * 0.5f), x = Math.max(24, vw() * 0.08f);
        return new float[]{x, 170, x + w, 550};
    }
    /** Option boxes: x1, y1, x2, y2 for each option of the current step. */
    private float[][] options() {
        float[] p = panel();
        Step st = STEPS[step];
        int n = st.options.length;
        boolean cards = st.notes != null;
        float ow = cards ? 170 : n == 1 ? 200 : 170, oh = cards ? 120 : 34, gap = 12;
        float total = n * ow + (n - 1) * gap, x = (p[0] + p[2]) / 2 - total / 2, y = cards ? p[1] + 150 : p[1] + 190;
        float[][] out = new float[n][];
        for (int i = 0; i < n; i++) out[i] = new float[]{x + i * (ow + gap), y, x + i * (ow + gap) + ow, y + oh};
        return out;
    }
    private float[] backBox() { float[] p = panel(); return new float[]{p[0] + 16, p[3] - 46, p[0] + 92, p[3] - 18}; }
    private float[] skipBox() { float[] p = panel(); return new float[]{p[0] + 100, p[3] - 46, p[0] + 188, p[3] - 18}; }
    private float[] nextBox() { float[] p = panel(); return new float[]{p[2] - 100, p[3] - 46, p[2] - 16, p[3] - 18}; }

    @Override
    public void render(GuiGraphics g, int mouseX, int mouseY, float delta) {
        // the painted valley behind, softly darkened
        float cover = Math.max(width / 1920f, height / 1080f);
        g.pose().pushMatrix();
        g.pose().translate((width - 1920 * cover) / 2f, (height - 1080 * cover) / 2f);
        g.pose().scale(cover, cover);
        g.blit(RenderPipelines.GUI_TEXTURED, BG, 0, 0, 0f, 0f, 1920, 1080, 1920, 1080);
        g.pose().popMatrix();
        g.fill(0, 0, width, height, 0x66070A12);

        // your character on the right
        float k = k(), vw = vw();
        if (player == null && Modules.TITLE_SCREEN.lobbyPlayer.on()) {
            float ph = 330, pw = ph * 0.55f, cx = Math.max(panel()[2] + pw / 2 + 40, vw * 0.76f);
            player = LobbyPlayer.create(minecraft, Math.round(pw * k), Math.round(ph * k));
            if (player != null) {
                player.setX(Math.round((cx - pw / 2) * k));
                player.setY(Math.round((720 * 0.84f - ph) * k));
                addRenderableWidget(player);
            }
        }
        super.render(g, mouseX, mouseY, delta);

        Canvas c = new Canvas(g, width, height);
        float in = Math.min(1f, (System.currentTimeMillis() - start) / 300f);
        c.a = in;
        double mx = mouseX / k, my = mouseY / k;
        c.begin();
        c.brand();
        float[] p = panel();
        float x1 = p[0], y1 = p[1] + (1 - in) * 12, x2 = p[2], y2 = p[3];
        c.d.rounded(x1, y1, x2, y2, 14, c.col(0xC20E1117), c.col(0x26FFFFFF));
        float cx = (x1 + x2) / 2;
        Step st = STEPS[step];
        c.txtC(st.kicker, cx, y1 + 42, 12, Canvas.MUTED, false);
        if (step == 0) {
            float tw = 0;
            for (char ch : st.title.toCharArray()) tw += c.tw(String.valueOf(ch), 26, true) + 2.4f;
            float lx = cx - (tw + 36) / 2;
            c.logo(lx, y1 + 58, 30);
            c.spaced(st.title, lx + 38, y1 + 74, 26, 2.4f, 0xFFFFFFFF, true);
        } else c.txtC(st.title, cx, y1 + 74, 26, 0xFFFFFFFF, true);
        float ty = y1 + 112;
        for (String line : Widgets.wrap(st.text, Math.round((x2 - x1 - 80) * 8 / 12f), 2)) { c.txtC(line, cx, ty, 12, 0xFFB9C0CA, false); ty += 18; }

        float[][] boxes = options();
        for (int i = 0; i < boxes.length; i++) {
            float[] b = boxes[i];
            boolean on = step == 0 || choice(step) == i, hov = Canvas.in(mx, my, b[0], b[1], b[2], b[3]);
            if (st.notes != null) {
                // style cards with a small preview of the menu
                c.d.rounded(b[0], b[1], b[2], b[3], 10, c.col(hov ? 0x66000000 : 0x4D000000), c.col(on ? Theme.accent() : 0x26FFFFFF));
                float px1 = b[0] + 12, py1 = b[1] + 12, px2 = b[2] - 12, py2 = b[1] + 64;
                boolean modern = i == 0;
                c.d.rounded(px1, py1, px2, py2, modern ? 6 : 0, c.col(modern ? 0xFF1A2231 : 0xFF6F6F6F));
                for (int r = 0; r < 3; r++) {
                    float ry = py1 + 8 + r * 15;
                    if (modern) c.d.rounded(px1 + 10, ry, px2 - 10, ry + 10, 4, c.col(r == 0 ? Theme.accent() : 0xFF2C3647));
                    else { c.d.rect(Math.round(px1 + 10), Math.round(ry), Math.round(px2 - 10), Math.round(ry + 10), c.col(0xFF000000)); c.d.rect(Math.round(px1 + 11), Math.round(ry + 1), Math.round(px2 - 11), Math.round(ry + 9), c.col(0xFF8B8B8B)); }
                }
                c.txt(st.options[i], b[0] + 12, b[1] + 82, 12, 0xFFFFFFFF, true);
                c.txt(st.notes[i], b[0] + 12, b[1] + 100, 9.5f, Canvas.MUTED, false);
            } else {
                c.d.rounded(b[0], b[1], b[2], b[3], 8, c.col(on ? (hov ? Draw.lerpColor(Theme.accent(), 0xFFFFFFFF, 0.12f) : Theme.accent()) : hov ? 0x66000000 : 0x4D000000), c.col(on ? 0x00000000 : 0x26FFFFFF));
                c.txtC(st.options[i], (b[0] + b[2]) / 2, (b[1] + b[3]) / 2, 12.5f, on ? 0xFFFFFFFF : 0xFFDCE1E8, step == 0);
            }
        }

        // footer: back, skip, dots, next
        if (step > 0) pill(c, backBox(), "Back", Draw.I_ARROW, true, false, mx, my);
        float[] sk = skipBox();
        c.txt("Skip setup", sk[0] + 8, (sk[1] + sk[3]) / 2, 11, Canvas.in(mx, my, sk[0], sk[1], sk[2], sk[3]) ? 0xFFFFFFFF : Canvas.MUTED, false);
        float dx = cx - (STEPS.length * 12) / 2f, dy = y2 - 32;
        for (int i = 0; i < STEPS.length; i++) {
            if (i == step) c.d.rounded(dx + i * 12 - 1, dy - 4, dx + i * 12 + 7, dy + 4, 4, c.col(Theme.accent()));
            else c.d.rounded(dx + i * 12, dy - 3, dx + i * 12 + 6, dy + 3, 3, c.col(0xFF3A4556));
        }
        pill(c, nextBox(), step == STEPS.length - 1 ? "Finish" : "Next", Draw.I_ARROW, false, true, mx, my);
        c.end();
    }

    private static void pill(Canvas c, float[] b, String label, int icon, boolean iconFlipped, boolean primary, double mx, double my) {
        boolean hov = Canvas.in(mx, my, b[0], b[1], b[2], b[3]);
        int fill = primary ? (hov ? Draw.lerpColor(Theme.accent(), 0xFFFFFFFF, 0.12f) : Theme.accent()) : hov ? 0x66000000 : 0x4D000000;
        c.d.rounded(b[0], b[1], b[2], b[3], 7, c.col(fill), c.col(primary ? 0 : 0x26FFFFFF));
        float cy = (b[1] + b[3]) / 2, w = c.tw(label, 11, primary) + 18, x = (b[0] + b[2]) / 2 - w / 2;
        if (iconFlipped) {
            c.d.push(); c.d.translate(x + 6, cy); c.d.scale(-1f); c.d.icon(icon, 0, 0, 11, c.col(0xFFFFFFFF)); c.d.pop();
            c.txt(label, x + 18, cy, 11, 0xFFFFFFFF, primary);
        } else {
            c.txt(label, x, cy, 11, 0xFFFFFFFF, primary);
            c.icon(icon, x + w - 6, cy, 11, 0xFFFFFFFF);
        }
    }

    @Override
    public boolean mouseClicked(MouseButtonEvent e, boolean doubleClick) {
        double mx = e.x() / k(), my = e.y() / k();
        float[][] boxes = options();
        for (int i = 0; i < boxes.length; i++) {
            float[] b = boxes[i];
            if (Canvas.in(mx, my, b[0], b[1], b[2], b[3])) {
                if (step == 0) step++; else pick(step, i);
                return true;
            }
        }
        float[] b = backBox();
        if (step > 0 && Canvas.in(mx, my, b[0], b[1], b[2], b[3])) { step--; return true; }
        b = skipBox();
        if (Canvas.in(mx, my, b[0], b[1], b[2], b[3])) { finish(); return true; }
        b = nextBox();
        if (Canvas.in(mx, my, b[0], b[1], b[2], b[3])) { if (step == STEPS.length - 1) finish(); else step++; return true; }
        return super.mouseClicked(e, doubleClick);
    }
}
