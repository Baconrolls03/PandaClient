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

    private static void request(Minecraft mc) {
        if (requested) return;
        requested = true;
        try { mc.getSkinManager().get(mc.getGameProfile()).thenAccept(o -> o.ifPresent(s -> skin = s)); } catch (Throwable ignored) {}
    }

    /** Draws your face (skin head) at x, y; false if the skin isn't ready yet. */
    public static boolean face(Minecraft mc, net.minecraft.client.gui.GuiGraphics g, int x, int y, int size) {
        request(mc);
        if (skin == null) return false;
        try { net.minecraft.client.gui.components.PlayerFaceRenderer.draw(g, skin, x, y, size); return true; } catch (Throwable t) { return false; }
    }

    /** The widget once your skin has loaded, else null (call again next frame). */
    public static AbstractWidget create(Minecraft mc, int w, int h) {
        request(mc);
        if (skin == null) return null;
        try { return new PlayerSkinWidget(w, h, mc.getEntityModels(), () -> skin); } catch (Throwable t) { return null; }
    }

    // ---------------------------------------------------------------- party members

    private static final java.util.Map<java.util.UUID, PlayerSkin> SKINS = new java.util.concurrent.ConcurrentHashMap<>();
    private static final java.util.Set<java.util.UUID> ASKED = java.util.concurrent.ConcurrentHashMap.newKeySet();

    private static PlayerSkin skinOf(Minecraft mc, java.util.UUID id, String name) {
        if (ASKED.add(id)) {
            PlayerSkin fallback = net.minecraft.client.resources.DefaultPlayerSkin.get(id);
            try {
                mc.getSkinManager().get(new com.mojang.authlib.GameProfile(id, name))
                    .thenAccept(o -> SKINS.put(id, o.orElse(fallback)))
                    .exceptionally(t -> { SKINS.put(id, fallback); return null; });
            } catch (Throwable t) {
                SKINS.put(id, fallback);
            }
        }
        return SKINS.get(id);
    }

    /** A party member's character (null until their skin is ready). */
    public static AbstractWidget createFor(Minecraft mc, java.util.UUID id, String name, int w, int h) {
        PlayerSkin s = skinOf(mc, id, name);
        if (s == null) return null;
        try { return new PlayerSkinWidget(w, h, mc.getEntityModels(), () -> s); } catch (Throwable t) { return null; }
    }

    /** A party member's face; false until their skin is ready. */
    public static boolean faceOf(Minecraft mc, net.minecraft.client.gui.GuiGraphics g, java.util.UUID id, String name, int x, int y, int size) {
        PlayerSkin s = skinOf(mc, id, name);
        if (s == null) return false;
        try { net.minecraft.client.gui.components.PlayerFaceRenderer.draw(g, s, x, y, size); return true; } catch (Throwable t) { return false; }
    }
}
