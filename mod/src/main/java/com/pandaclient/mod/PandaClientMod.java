package com.pandaclient.mod;

import com.pandaclient.mod.config.Config;
import com.pandaclient.mod.gui.Draw;
import com.pandaclient.mod.gui.HudEditorScreen;
import com.pandaclient.mod.gui.MenuScreen;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Modules;
import com.pandaclient.mod.module.hud.HudModule;
import com.pandaclient.mod.util.Combat;
import com.mojang.blaze3d.platform.InputConstants;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry;
import net.minecraft.client.CameraType;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.resources.Identifier;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;

public final class PandaClientMod implements ClientModInitializer {
    public static final String VERSION = "0.3.0";
    private static CameraType cameraBeforeFreelook;
    private static boolean hitboxesApplied, menuWasDown, sprintWasDown, sneakWasDown, freelookWasDown;
    private static int prevSelfHurt;

    @Override
    public void onInitializeClient() {
        Keys.register();
        Config.load();
        HudElementRegistry.addLast(Identifier.fromNamespaceAndPath("pandaclient", "hud"), PandaClientMod::renderHud);
        ClientTickEvents.END_CLIENT_TICK.register(PandaClientMod::tick);
        // A "PandaClient" button on the title screen and the pause menu (Esc), so the menu is easy to find.
        net.fabricmc.fabric.api.client.screen.v1.ScreenEvents.AFTER_INIT.register((client, screen, w, h) -> {
            if (!(screen instanceof net.minecraft.client.gui.screens.TitleScreen || screen instanceof net.minecraft.client.gui.screens.PauseScreen)) return;
            // A small button in the top-left corner, out of the way of other mods' buttons (e.g. Mod Menu).
            net.fabricmc.fabric.api.client.screen.v1.Screens.getButtons(screen).add(
                net.minecraft.client.gui.components.Button.builder(net.minecraft.network.chat.Component.literal("PandaClient"),
                    b -> client.setScreen(new MenuScreen(screen))).bounds(4, 4, 70, 16).build());
        });
        Runtime.getRuntime().addShutdownHook(new Thread(Config::save, "PandaClient config save"));
        System.out.println("[PandaClient] " + VERSION + " loaded with " + Modules.all().size() + " mods");
    }

    private static void renderHud(GuiGraphics g, net.minecraft.client.DeltaTracker dt) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.options.hideGui || mc.screen instanceof HudEditorScreen) return;
        Draw d = new Draw(g);
        int w = g.guiWidth(), h = g.guiHeight();
        for (HudModule m : Modules.hud()) if (m.enabled() && m.visible()) m.draw(d, w, h, false);
    }

    private static boolean physicallyDown(Minecraft mc, net.minecraft.client.KeyMapping k) {
        var key = KeyBindingHelper.getBoundKeyOf(k);
        if (key.getType() != InputConstants.Type.KEYSYM || key.getValue() < 0) return k.isDown();
        return InputConstants.isKeyDown(mc.getWindow(), key.getValue());
    }

    private static void tick(Minecraft mc) {
        com.pandaclient.mod.util.CiCheck.tick(mc);
        Config.tick();
        Combat.tick();
        if (mc.level == null) Config.writePresence(null);
        else if (mc.level.getGameTime() % 100 == 0) Config.writePresence(mc.getCurrentServer() != null ? mc.getCurrentServer().ip : "Singleplayer");
        com.pandaclient.mod.util.HitColorTexture.tick();
        // Hitboxes: follow the switch (F3+B still works on its own).
        if (mc.debugEntries != null && Modules.HITBOXES.enabled() != hitboxesApplied) {
            hitboxesApplied = Modules.HITBOXES.enabled();
            var id = net.minecraft.client.gui.components.debug.DebugScreenEntries.ENTITY_HITBOXES;
            if (mc.debugEntries.isCurrentlyEnabled(id) != hitboxesApplied) mc.debugEntries.toggleStatus(id);
        }
        // PandaClient title screen instead of the vanilla one.
        if (Modules.TITLE_SCREEN.enabled() && mc.screen != null && mc.screen.getClass() == net.minecraft.client.gui.screens.TitleScreen.class)
            mc.setScreen(new com.pandaclient.mod.gui.PandaTitleScreen());
        if (Modules.COSMETICS.enabled()) {
            com.pandaclient.mod.cosmetics.CosmeticsApi.loadCatalog();
            if (mc.level != null && mc.level.getGameTime() % 40 == 0) {
                java.util.List<java.util.UUID> ids = new java.util.ArrayList<>();
                for (var p : mc.level.players()) ids.add(p.getUUID());
                if (mc.getConnection() != null) for (var info : mc.getConnection().getOnlinePlayers()) ids.add(info.getProfile().id());
                com.pandaclient.mod.cosmetics.CosmeticsApi.request(ids);
            }
        }
        // Read our keys straight from the keyboard: with many mods installed another mod may use the same
        // key, and Minecraft then only fires one of the key binds.
        boolean menuDown = physicallyDown(mc, Keys.MENU);
        while (Keys.MENU.consumeClick()) { /* handled below */ }
        if (menuDown && !menuWasDown && mc.screen == null) mc.setScreen(new MenuScreen(null));
        menuWasDown = menuDown;
        while (Keys.HUD_EDITOR.consumeClick()) if (mc.screen == null) mc.setScreen(new HudEditorScreen(null));
        for (Module m : Modules.all()) if (m.enabled()) m.tick();

        if (mc.player == null) { Modules.FREELOOK.active = false; return; }
        boolean inGame = mc.screen == null;

        // Toggle sprint / sneak: a fresh press of the key flips the toggle.
        var ts = Modules.TOGGLE_SPRINT;
        boolean sprintDown = inGame && physicallyDown(mc, mc.options.keySprint);
        boolean sneakDown = inGame && physicallyDown(mc, mc.options.keyShift);
        if (ts.enabled()) {
            if (sprintDown && !sprintWasDown) ts.sprinting = !ts.sprinting;
            if (ts.sneak.on() && sneakDown && !sneakWasDown) ts.sneaking = !ts.sneaking;
            if (!ts.sneak.on()) ts.sneaking = false;
        } else { ts.sprinting = false; ts.sneaking = false; }
        sprintWasDown = sprintDown; sneakWasDown = sneakDown;

        // Zoom
        var zoom = Modules.ZOOM;
        boolean zoomHeld = (inGame && physicallyDown(mc, Keys.ZOOM)) || com.pandaclient.mod.util.CiCheck.forceZoom;
        if (!zoomHeld) zoom.scrollFactor = 1;
        zoom.held = zoomHeld;

        // Freelook: hold (or toggle) to orbit the camera in third person.
        var fl = Modules.FREELOOK;
        boolean flDown = (inGame && physicallyDown(mc, Keys.FREELOOK)) || com.pandaclient.mod.util.CiCheck.forceFreelook;
        boolean want = fl.active;
        if (!fl.enabled()) want = false;
        else if (fl.hold.on()) want = flDown;
        else if (flDown && !freelookWasDown) want = !fl.active;
        freelookWasDown = flDown;
        if (want && !fl.active) {
            fl.yaw = mc.player.getYRot(); fl.pitch = mc.player.getXRot();
            cameraBeforeFreelook = mc.options.getCameraType();
            mc.options.setCameraType(CameraType.THIRD_PERSON_BACK);
            fl.active = true;
        } else if (!want && fl.active) {
            fl.active = false;
            if (cameraBeforeFreelook != null) mc.options.setCameraType(cameraBeforeFreelook);
        }

        // Combo counter: did the entity we hit take damage? Did we?
        if (Combat.lastTargetId >= 0 || Combat.combo >= 0) {
            Entity target = mc.level.getEntity(Combat.pendingTarget());
            if (target instanceof LivingEntity le && le.hurtTime >= 9) Combat.targetHurt(le.getId());
        }
        int selfHurt = mc.player.hurtTime;
        if (selfHurt > prevSelfHurt) Combat.selfHurt();
        prevSelfHurt = selfHurt;
    }
}
