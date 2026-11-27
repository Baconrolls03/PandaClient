package com.pandaclient.mod.gui;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.client.gui.components.PlayerSkinWidget;
import net.minecraft.world.entity.player.PlayerSkin;

/** Your character standing in the main menu lobby (drag to spin it), using Minecraft's skin preview. */
public final class LobbyPlayer {
    private LobbyPlayer() {}
    private static PlayerSkin skin;
    private static boolean requested;

    /** The widget once your skin has loaded, else null (call again next frame). */
    public static AbstractWidget create(Minecraft mc, int w, int h) {
        if (!requested) {
            requested = true;
            try { mc.getSkinManager().get(mc.getGameProfile()).thenAccept(o -> o.ifPresent(s -> skin = s)); } catch (Throwable ignored) {}
        }
        if (skin == null) return null;
        try { return new PlayerSkinWidget(w, h, mc.getEntityModels(), () -> skin); } catch (Throwable t) { return null; }
    }
}
