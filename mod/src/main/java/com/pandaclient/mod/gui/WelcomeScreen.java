package com.pandaclient.mod.gui;

import com.pandaclient.mod.config.Config;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Modules;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.input.MouseButtonEvent;
import net.minecraft.network.chat.Component;

import java.nio.file.Files;
import java.nio.file.Path;

/** First time in game: a few quick choices over the main menu (like OneClient's setup). */
public final class WelcomeScreen extends Screen {
    private record Step(String kicker, String title, String text, String[] options) {}

    private static final Step[] STEPS = {
        new Step("Welcome to", "PANDACLIENT", "A few quick choices and you're ready. You can change all of them later (Right Shift).", new String[]{"Let's go"}),
        new Step("Let's set up the", "Look & Feel", "How should buttons in every menu look?", new String[]{"PandaClient", "Minecraft"}),
        new Step("Continuing with", "Toggle Sprint", "Sprint stays on after you let go of the key.", new String[]{"Enabled", "Disabled"}),
        new Step("Continuing with", "PvP HUD", "Show FPS, CPS and keystrokes on screen.", new String[]{"Show", "Hide"}),
        new Step("One choice left:", "Fullbright", "See clearly in caves and at night.", new String[]{"On", "Off"}),
    };

    private final Screen next;
    private int step;
    private final long start = System.currentTimeMillis();

    public WelcomeScreen(Screen next) {
        super(Component.literal("Welcome to PandaClient"));
        this.next = next;
    }

    private static Path marker() { return FabricLoader.getInstance().getConfigDir().resolve("pandaclient-welcome-done"); }
    public static boolean done() { return Files.exists(marker()); }

    @Override public boolean shouldCloseOnEsc() { return false; }

    private int choice(int s) {
        return switch (s) {
            case 1 -> Modules.TITLE_SCREEN.buttons.is("PandaClient") ? 0 : 1;
            case 2 -> Modules.TOGGLE_SPRINT.enabled() ? 0 : 1;
            case 3 -> Modules.FPS.enabled() && Modules.KEYSTROKES.enabled() ? 0 : 1;
            case 4 -> Modules.FULLBRIGHT.enabled() ? 0 : 1;
            default -> 0;
        };
    }

    private void pick(int s, int i) {
        switch (s) {
            case 1 -> Modules.TITLE_SCREEN.buttons.set(i == 0 ? "PandaClient" : "Minecraft");
            case 2 -> Modules.TOGGLE_SPRINT.setEnabled(i == 0);
            case 3 -> { for (Module m : new Module[]{Modules.FPS, Modules.CPS, Modules.KEYSTROKES}) m.setEnabled(i == 0); }
            case 4 -> Modules.FULLBRIGHT.setEnabled(i == 0);
            default -> {}
        }
        Config.markDirty();
    }

    private void finish() {
        try { Files.writeString(marker(), "done"); } catch (Exception ignored) {}
        Config.save();
        minecraft.setScreen(next);
    }

    private int pw() { return Math.min(300, width - 30); }
    private int ph() { return Math.min(170, height - 30); }
    private int px() { return width / 2 - pw() / 2; }
    private int py() { return height / 2 - ph() / 2; }

    @Override
    public void render(GuiGraphics g, int mx, int my, float delta) {
        Draw d = new Draw(g);
        d.rect(0, 0, width, height, 0x88070A12);
        float in = Math.min(1f, (System.currentTimeMillis() - start) / 300f);
        int x = px(), y = py() + Math.round((1 - in) * 10), w = pw(), h = ph();
        d.round(x, y, x + w, y + h, Draw.alpha(0xFF0E1420, (int) (235 * in)));
        d.rect(x + 2, y, x + w - 2, y + 1, 0x22FFFFFF);
        Step st = STEPS[step];
        d.push(); d.translate(width / 2f, y + 14); d.scale(0.75f);
        d.centered(st.kicker, 0, 0, 0xFF9AA4B2, false);
        d.pop();
        d.push(); d.translate(width / 2f, y + 24); d.scale(1.6f);
        d.centered(st.title, 0, 0, 0xFFFFFFFF, true);
        d.pop();
        int ty = y + 48;
        for (String line : Widgets.wrap(st.text, w - 30, 2)) { d.centered(line, width / 2, ty, 0xFFB7C0CC, false); ty += 10; }
        // options
        int n = st.options.length, ow = Math.min(110, (w - 30 - (n - 1) * 6) / n), total = n * ow + (n - 1) * 6;
        int ox = width / 2 - total / 2, oy = y + 82;
        for (int i = 0; i < n; i++) {
            int bx = ox + i * (ow + 6);
            boolean on = step == 0 || choice(step) == i, hov = Widgets.in(mx, my, bx, oy, ow, 22);
            d.round(bx, oy, bx + ow, oy + 22, on ? Theme.accent() : hov ? 0xFF223044 : 0xFF161D29);
            d.centered(st.options[i], bx + ow / 2, oy + 7, on ? 0xFF0B0F16 : 0xFFE3E9F1, false);
        }
        // footer: back / skip / dots / next
        int fy = y + h - 22;
        if (step > 0) Widgets.button(d, x + 10, fy, 40, 14, "< Back", Widgets.in(mx, my, x + 10, fy, 40, 14), false);
        Widgets.button(d, x + 54, fy, 54, 14, "Skip setup", Widgets.in(mx, my, x + 54, fy, 54, 14), false);
        for (int i = 0; i < STEPS.length; i++) d.round(width / 2 + 10 + i * 7, fy + 5, width / 2 + 14 + i * 7, fy + 9, i == step ? Theme.accent() : 0xFF3A4556);
        boolean last = step == STEPS.length - 1;
        Widgets.button(d, x + w - 56, fy, 46, 14, last ? "Finish" : "Next >", Widgets.in(mx, my, x + w - 56, fy, 46, 14), true);
    }

    @Override
    public boolean mouseClicked(MouseButtonEvent e, boolean doubleClick) {
        double mx = e.x(), my = e.y();
        int x = px(), y = py(), w = pw(), h = ph();
        Step st = STEPS[step];
        int n = st.options.length, ow = Math.min(110, (w - 30 - (n - 1) * 6) / n), total = n * ow + (n - 1) * 6;
        int ox = width / 2 - total / 2, oy = y + 82;
        for (int i = 0; i < n; i++) {
            if (Widgets.in(mx, my, ox + i * (ow + 6), oy, ow, 22)) {
                if (step == 0) step++; else pick(step, i);
                return true;
            }
        }
        int fy = y + h - 22;
        if (step > 0 && Widgets.in(mx, my, x + 10, fy, 40, 14)) { step--; return true; }
        if (Widgets.in(mx, my, x + 54, fy, 54, 14)) { finish(); return true; }
        if (Widgets.in(mx, my, x + w - 56, fy, 46, 14)) { if (step == STEPS.length - 1) finish(); else step++; return true; }
        return super.mouseClicked(e, doubleClick);
    }
}
