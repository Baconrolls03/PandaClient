package com.pandaclient.mod.util;

import com.pandaclient.mod.gui.HudEditorScreen;
import com.pandaclient.mod.gui.MenuScreen;
import com.pandaclient.mod.module.Modules;
import net.minecraft.client.Minecraft;
import org.spongepowered.asm.mixin.MixinEnvironment;

/**
 * Only active when PANDACLIENT_CI=1 (the GitHub Actions smoke test): opens the menu, a mod's
 * settings and the HUD editor, checks every mixin applies, then quits.
 */
public final class CiCheck {
    private CiCheck() {}
    public static final boolean ON = "1".equals(System.getenv("PANDACLIENT_CI"));
    private static int ticks = -1;

    public static void tick(Minecraft mc) {
        if (!ON) return;
        // First launch shows the accessibility welcome screen instead of the title screen; either is fine.
        if (mc.getOverlay() != null || mc.screen == null && ticks < 0) return;
        if (ticks < 0) log("game ready on " + mc.screen.getClass().getSimpleName());
        ticks = Math.max(ticks, 0) + 1;
        switch (ticks) {
            case 40 -> { mc.setScreen(new MenuScreen(null)); log("menu"); }
            case 140 -> { mc.setScreen(MenuScreen.openAt(null, Modules.KEYSTROKES)); log("settings"); }
            case 240 -> { mc.setScreen(new HudEditorScreen(null)); log("hud"); }
            case 340 -> {
                try {
                    MixinEnvironment.getCurrentEnvironment().audit();
                    log("mixins OK");
                } catch (Throwable t) {
                    log("mixin audit FAILED: " + t);
                    t.printStackTrace(System.out);
                }
                log("done");
                mc.stop();
            }
            default -> {}
        }
    }

    private static void log(String s) { System.out.println("[PandaClient CI] " + s); System.out.flush(); }
}
