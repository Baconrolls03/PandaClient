package com.pandaclient.mod.gui;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.components.AbstractWidget;

/** Before 1.21.9 the skin preview widget isn't available: no character in the lobby. */
public final class LobbyPlayer {
    private LobbyPlayer() {}
    public static AbstractWidget create(Minecraft mc, int w, int h) { return null; }
}
