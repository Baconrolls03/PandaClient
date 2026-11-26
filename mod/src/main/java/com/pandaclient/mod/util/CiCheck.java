package com.pandaclient.mod.util;

import com.pandaclient.mod.gui.HudEditorScreen;
import com.pandaclient.mod.gui.MenuScreen;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Modules;
import net.minecraft.client.Minecraft;
import org.spongepowered.asm.mixin.MixinEnvironment;

/**
 * Only active when PANDACLIENT_CI=1 (the GitHub Actions smoke test). On the title screen it opens
 * the menu, a settings page and the HUD editor; in a world (joined through a local test server) it
 * turns every mod on, holds zoom and freelook and checks toggle sprint, then checks every mixin and quits.
 */
public final class CiCheck {
    private CiCheck() {}
    public static final boolean ON = "1".equals(System.getenv("PANDACLIENT_CI"));
    public static boolean forceZoom, forceFreelook;
    private static int ticks = -1, worldTicks = -1;
    private static boolean expectWorld = System.getenv("PANDACLIENT_CI_WORLD") != null;

    public static void tick(Minecraft mc) {
        if (!ON || mc.getOverlay() != null) return;
        if (expectWorld) { worldTick(mc); return; }
        if (mc.screen == null && ticks < 0) return;
        if (ticks < 0) log("game ready on " + mc.screen.getClass().getSimpleName());
        ticks = Math.max(ticks, 0) + 1;
        switch (ticks) {
            case 40 -> { mc.setScreen(new MenuScreen(null)); log("shot menu"); }
            case 140 -> { mc.setScreen(MenuScreen.openAt(null, Modules.KEYSTROKES)); log("shot settings"); }
            case 240 -> { mc.setScreen(new HudEditorScreen(null)); log("shot hud"); }
            case 340 -> finish(mc);
            default -> {}
        }
    }

    private static void worldTick(Minecraft mc) {
        if (mc.player == null || mc.level == null) {
            if (worldTicks >= 0) { log("left the world unexpectedly"); finish(mc); }
            return;
        }
        worldTicks++;
        var cmd = mc.player.connection;
        switch (worldTicks) {
            case 1 -> {
                log("in world as " + mc.player.getName().getString());
                for (Module m : Modules.all()) if (m != Modules.FREELOOK) m.setEnabled(true);
                Modules.FREELOOK.setEnabled(true);
            }
            case 20 -> {
                cmd.sendCommand("item replace entity @s armor.head with diamond_helmet");
                cmd.sendCommand("item replace entity @s armor.chest with diamond_chestplate");
                cmd.sendCommand("item replace entity @s armor.legs with iron_leggings");
                cmd.sendCommand("item replace entity @s armor.feet with diamond_boots");
                cmd.sendCommand("item replace entity @s weapon.mainhand with diamond_sword");
                cmd.sendCommand("give @s ender_pearl 16");
                cmd.sendCommand("give @s golden_apple 8");
                cmd.sendCommand("give @s arrow 64");
                cmd.sendCommand("effect give @s speed 600 1");
                cmd.sendCommand("effect give @s strength 600 0");
                cmd.sendCommand("effect give @s fire_resistance 600 0");
                cmd.sendCommand("time set midnight");
                cmd.sendCommand("summon zombie ~2 ~ ~3 {NoAI:1b}");
            }
            case 40 -> mc.gui.getChat().addMessage(net.minecraft.network.chat.Component.literal("PandaClient chat test"));
            case 100 -> {
                log("hud check: armor=" + Game.armorAndHand(true).length + " effects=" + Game.effects().size()
                    + " pearls=" + countOf(Game.countedItems(true)) + " fps=" + Game.fps() + " ping=" + Game.ping());
                Modules.TOGGLE_SPRINT.sprinting = true;
                log("toggle sprint reports sprint key down: " + mc.options.keySprint.isDown());
                log("shot ingame");
            }
            case 180 -> { forceZoom = true; log("zoom multiplier " + String.format("%.3f", Modules.ZOOM.multiplier())); }
            case 200 -> log("shot zoom");
            case 260 -> { forceZoom = false; forceFreelook = true; }
            case 280 -> log("freelook active=" + Modules.FREELOOK.active + " camera=" + mc.options.getCameraType());
            case 285 -> log("shot freelook");
            case 340 -> { forceFreelook = false; Modules.TOGGLE_SPRINT.sprinting = false; mc.setScreen(MenuScreen.openAt(null, Modules.CROSSHAIR)); log("shot crosshair-settings"); }
            case 420 -> { mc.setScreen(new HudEditorScreen(null)); log("shot hud-world"); }
            case 470 -> mc.setScreen(new net.minecraft.client.gui.screens.PauseScreen(true));
            case 480 -> {
                StringBuilder b = new StringBuilder();
                for (var w : net.fabricmc.fabric.api.client.screen.v1.Screens.getButtons(mc.screen)) b.append('[').append(w.getMessage().getString()).append(" @").append(w.getX()).append(',').append(w.getY()).append("] ");
                log("pause menu (" + mc.screen.getClass().getSimpleName() + ") buttons: " + b);
            }
            case 500 -> { mc.setScreen(null); log("freelook restored camera=" + mc.options.getCameraType()); }
            case 520 -> finish(mc);
            default -> {}
        }
    }

    private static int countOf(Game.Stack[] s) { int n = 0; for (Game.Stack x : s) n += x.count(); return n; }

    private static void finish(Minecraft mc) {
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

    private static void log(String s) { System.out.println("[PandaClient CI] " + s); System.out.flush(); }
}
