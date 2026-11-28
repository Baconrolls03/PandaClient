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
    public static final String VERSION = "0.11.4";
    private static CameraType cameraBeforeFreelook;
    private static boolean hitboxesApplied, menuWasDown, sprintWasDown, sneakWasDown, freelookWasDown;
    private static int prevSelfHurt;

    @Override
    public void onInitializeClient() {
        Keys.register();
        Config.load();
        HudElementRegistry.addLast(Identifier.fromNamespaceAndPath("pandaclient", "hud"), PandaClientMod::renderHud);
        ClientTickEvents.END_CLIENT_TICK.register(PandaClientMod::tick);
        // Hats, glasses, wings... on every player model.
        net.fabricmc.fabric.api.client.rendering.v1.LivingEntityFeatureRendererRegistrationCallback.EVENT.register((type, renderer, helper, ctx) -> {
            if (renderer instanceof net.minecraft.client.renderer.entity.player.AvatarRenderer<?> avatar)
                helper.register(new com.pandaclient.mod.cosmetics.AccessoryLayer(pandaclient$parent(avatar)));
        });
        // A "PandaClient" button on the title screen and the pause menu (Esc), so the menu is easy to find.
        net.fabricmc.fabric.api.client.screen.v1.ScreenEvents.AFTER_INIT.register((client, screen, w, h) -> {
            String cls = screen.getClass().getSimpleName().toLowerCase(java.util.Locale.ROOT);
            boolean pause = screen instanceof net.minecraft.client.gui.screens.PauseScreen || cls.contains("pause") || cls.contains("gamemenu");
            boolean title = screen instanceof net.minecraft.client.gui.screens.TitleScreen;
            if (!pause && !title) return;
            var buttons = net.fabricmc.fabric.api.client.screen.v1.Screens.getButtons(screen);
            // Next to the top button of the menu (e.g. "Back to Game"), so it's easy to spot and never covered.
            net.minecraft.client.gui.components.AbstractWidget top = null;
            for (var b : buttons) if (b.getWidth() >= 150 && (top == null || b.getY() < top.getY())) top = b;
            int bx = top != null ? top.getX() - 78 : 4, by = top != null ? top.getY() : 4;
            if (bx < 2) { bx = 4; by = 4; }
            boolean backToLobby = title && screen == com.pandaclient.mod.gui.PandaTitleScreen.vanillaTitle;
            var panda = net.minecraft.client.gui.components.Button.builder(net.minecraft.network.chat.Component.literal(backToLobby ? "Lobby" : "PandaClient"),
                b -> client.setScreen(backToLobby ? new com.pandaclient.mod.gui.PandaTitleScreen() : new MenuScreen(screen))).bounds(bx, by, 74, 20).build();
            buttons.add(panda);
            // PandaClient pause menu: player on the left, the menu as a list on the right.
            if (screen instanceof net.minecraft.client.gui.screens.PauseScreen ps && ps.showsPauseMenu()
                    && Modules.TITLE_SCREEN.enabled() && Modules.TITLE_SCREEN.pauseMenu.on()) {
                if (Modules.TITLE_SCREEN.lobbyFromWorld.on()) com.pandaclient.mod.util.LobbyPanorama.capture(client);
                try {
                    // PandaClient's own buttons in the menu: its mods and the HUD editor
                    panda.setMessage(net.minecraft.network.chat.Component.literal("PandaClient Mods"));
                    var hud = net.minecraft.client.gui.components.Button.builder(net.minecraft.network.chat.Component.literal("Edit HUD"),
                        b -> client.setScreen(new com.pandaclient.mod.gui.HudEditorScreen(screen))).bounds(0, 0, 200, 20).build();
                    buttons.add(hud);
                    var more = net.minecraft.client.gui.components.Button.builder(net.minecraft.network.chat.Component.literal("More..."),
                        b -> com.pandaclient.mod.gui.PauseLayout.toggleMore()).bounds(0, 0, 100, 20).build();
                    buttons.add(more);
                    com.pandaclient.mod.gui.PauseLayout.apply(buttons, java.util.List.of(panda, hud), more, w, h);
                    net.fabricmc.fabric.api.client.screen.v1.ScreenEvents.beforeRender(screen).register((s2, g, mx, my, delta) ->
                        com.pandaclient.mod.gui.PauseLayout.renderShade(g, s2.width, s2.height));
                    net.fabricmc.fabric.api.client.screen.v1.ScreenEvents.afterRender(screen).register((s2, g, mx, my, delta) ->
                        com.pandaclient.mod.gui.PauseLayout.render(g, s2.width, s2.height, mx, my));
                } catch (Throwable t) {
                    System.err.println("[PandaClient] Pause menu layout failed: " + t);
                }
            }
        });
        Runtime.getRuntime().addShutdownHook(new Thread(Config::save, "PandaClient config save"));
        System.out.println("[PandaClient] " + VERSION + " loaded with " + Modules.all().size() + " mods");
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static net.minecraft.client.renderer.entity.RenderLayerParent<net.minecraft.client.renderer.entity.state.AvatarRenderState, net.minecraft.client.model.player.PlayerModel> pandaclient$parent(Object r) {
        return (net.minecraft.client.renderer.entity.RenderLayerParent) r;
    }

    private static void renderHud(GuiGraphics g, net.minecraft.client.DeltaTracker dt) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.options.hideGui || mc.screen instanceof HudEditorScreen) return;
        Draw d = new Draw(g);
        int w = g.guiWidth(), h = g.guiHeight();
        Draw.hud = true;
        try {
        for (HudModule m : Modules.hud()) {
            try {
                if (m.enabled() && m.visible()) m.draw(d, w, h, false);
            } catch (Throwable t) {
                // Never let one HUD element break the game (e.g. a clash with another mod): turn it off and say why.
                m.setEnabled(false);
                System.err.println("[PandaClient] Turned off " + m.name + " after an error: " + t);
            }
        }
        } finally { Draw.hud = false; }
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
        if (Modules.TITLE_SCREEN.enabled() && mc.screen != null && mc.screen.getClass() == net.minecraft.client.gui.screens.TitleScreen.class
                && mc.screen != com.pandaclient.mod.gui.PandaTitleScreen.vanillaTitle)
            mc.setScreen(com.pandaclient.mod.gui.WelcomeScreen.done() || com.pandaclient.mod.util.CiCheck.ON
                ? new com.pandaclient.mod.gui.PandaTitleScreen()
                : new com.pandaclient.mod.gui.WelcomeScreen(new com.pandaclient.mod.gui.PandaTitleScreen()));
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
        for (Module m : Modules.all()) {
            try { if (m.enabled()) m.tick(); } catch (Throwable t) { m.setEnabled(false); System.err.println("[PandaClient] Turned off " + m.name + " after an error: " + t); }
        }
        com.pandaclient.mod.util.StartMarker.tick(mc);

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
