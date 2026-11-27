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
        captureIfDue(mc);
        if (expectWorld) { worldTick(mc); return; }
        if (mc.screen == null && ticks < 0) return;
        if (ticks < 0) log("game ready on " + mc.screen.getClass().getSimpleName());
        ticks = Math.max(ticks, 0) + 1;
        switch (ticks) {
            case 2 -> {
                // A few servers so the lobby's server card shows real entries.
                try {
                    var list = new net.minecraft.client.multiplayer.ServerList(mc);
                    list.load();
                    if (list.size() == 0) {
                        for (String[] sv : new String[][]{{"Hypixel", "mc.hypixel.net"}, {"Minemen Club", "minemen.club"}, {"PvP Legacy", "pvplegacy.net"}, {"Lunar Network", "lunar.gg"}})
                            list.add(new net.minecraft.client.multiplayer.ServerData(sv[0], sv[1], net.minecraft.client.multiplayer.ServerData.Type.OTHER), false);
                        list.save();
                    }
                } catch (Throwable t) { log("could not add test servers: " + t); }
                // A test party, as the launcher would write it.
                try {
                    String me = mc.getUser().getName();
                    java.nio.file.Files.writeString(com.pandaclient.mod.config.Config.sibling("pandaclient-party.json"),
                        "{\"members\":[{\"uuid\":\"" + mc.getUser().getProfileId() + "\",\"name\":\"" + me + "\",\"leader\":true,\"online\":true},"
                        + "{\"uuid\":\"069a79f4-44e9-4726-a5be-fca90e38aaf5\",\"name\":\"Notch\",\"leader\":false,\"online\":true},"
                        + "{\"uuid\":\"853c80ef-3c37-49fd-aa49-938b674adae6\",\"name\":\"jeb_\",\"leader\":false,\"online\":false}]}");
                } catch (Throwable t) { log("could not write test party: " + t); }
                mc.setScreen(new com.pandaclient.mod.gui.PandaTitleScreen());
            }
            case 24 -> log("party: " + com.pandaclient.mod.util.Party.members().size() + " members");
            case 40 -> log("shot lobby");
            case 72 -> {
                if (mc.screen instanceof com.pandaclient.mod.gui.PandaTitleScreen p) p.ciPose();
                log("shot lobby-throw");
            }
            case 104 -> { mc.setScreen(new MenuScreen(mc.screen)); log("shot menu"); }
            case 140 -> { mc.setScreen(MenuScreen.openAt(null, Modules.KEYSTROKES)); log("shot settings"); }
            case 240 -> { mc.setScreen(new HudEditorScreen(null)); log("shot hud"); }
            case 300 -> {
                // One settings menu: every mod's own settings screen, found through Mod Menu's entry point.
                var cfgs = ModConfigs.all();
                log("modmenu loaded=" + net.fabricmc.loader.api.FabricLoader.getInstance().isModLoaded("modmenu") + " dynamic_fps loaded=" + net.fabricmc.loader.api.FabricLoader.getInstance().isModLoaded("dynamic_fps"));
                log("mod settings found: " + cfgs.size() + " " + cfgs.stream().map(ModConfigs.Entry::name).toList() + " (entry points seen: " + ModConfigs.seen + ")");
                if (!cfgs.isEmpty()) {
                    var screen = cfgs.get(0).open().apply(new MenuScreen(null));
                    log("opened " + cfgs.get(0).name() + " settings: " + (screen == null ? "nothing" : screen.getClass().getName()));
                    if (screen != null) mc.setScreen(screen);
                }
            }
            case 320 -> { mc.setScreen(new com.pandaclient.mod.gui.WelcomeScreen(new com.pandaclient.mod.gui.PandaTitleScreen())); log("shot welcome"); }
            case 360 -> finish(mc);
            default -> {}
        }
    }

    private static boolean leftForLobby;
    private static int lobbyTicks;

    private static void worldTick(Minecraft mc) {
        if (mc.player == null || mc.level == null) {
            if (leftForLobby) {
                lobbyTicks++;
                if (lobbyTicks == 40) { log("back in the lobby on " + (mc.screen == null ? "nothing" : mc.screen.getClass().getSimpleName())); log("shot lobby-world"); }
                if (lobbyTicks == 90) finish(mc);
                return;
            }
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
            case 470 -> { mc.setScreen(new net.minecraft.client.gui.screens.PauseScreen(true)); log("shot pause"); }
            case 480 -> {
                StringBuilder b = new StringBuilder();
                for (var w : net.fabricmc.fabric.api.client.screen.v1.Screens.getButtons(mc.screen)) b.append('[').append(w.getMessage().getString()).append(" @").append(w.getX()).append(',').append(w.getY()).append("] ");
                log("pause menu (" + mc.screen.getClass().getSimpleName() + ") buttons: " + b + " primary=" + (com.pandaclient.mod.gui.PauseLayout.primary != null ? com.pandaclient.mod.gui.PauseLayout.primary.getMessage().getString() : "none"));
            }
            case 545 -> { mc.setScreen(null); log("freelook restored camera=" + mc.options.getCameraType()); }
            case 565 -> {
                // leave the world like a player would: the lobby should show where you were
                log("lobby panorama captured: " + com.pandaclient.mod.util.LobbyPanorama.available());
                leftForLobby = true;
                mc.disconnect(new com.pandaclient.mod.gui.PandaTitleScreen(), false);
            }
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

    private static void log(String s) {
        System.out.println("[PandaClient CI] " + s);
        System.out.flush();
        if (s.startsWith("shot ")) { pendingShot = s.substring(5).trim(); shotAt = System.currentTimeMillis() + 1300; }
    }

    // Real screenshots from inside the game (the X server's own capture comes out black with software OpenGL).
    private static String pendingShot;
    private static long shotAt;

    private static void captureIfDue(Minecraft mc) {
        if (pendingShot == null || System.currentTimeMillis() < shotAt) return;
        String name = pendingShot;
        pendingShot = null;
        try {
            java.nio.file.Path dir = net.fabricmc.loader.api.FabricLoader.getInstance().getGameDir().resolve("ci-shots");
            java.nio.file.Files.createDirectories(dir);
            net.minecraft.client.Screenshot.takeScreenshot(mc.getMainRenderTarget(), img -> {
                try (img) {
                    java.nio.file.Path tmp = dir.resolve(name + ".tmp");
                    img.writeToFile(tmp);
                    java.nio.file.Files.move(tmp, dir.resolve(name + ".png"), java.nio.file.StandardCopyOption.ATOMIC_MOVE);
                } catch (Exception e) { System.out.println("[PandaClient CI] screenshot failed: " + e); }
            });
        } catch (Throwable t) { System.out.println("[PandaClient CI] screenshot failed: " + t); }
    }
}
