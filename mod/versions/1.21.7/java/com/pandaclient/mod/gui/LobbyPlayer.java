package com.pandaclient.mod.gui;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.components.AbstractWidget;

/** Before 1.21.9 the skin preview widget isn't available: no character in the lobby. */
public final class LobbyPlayer {
    private LobbyPlayer() {}
    public static boolean face(Minecraft mc, net.minecraft.client.gui.GuiGraphics g, int x, int y, int size) { return false; }
    public static AbstractWidget create(Minecraft mc, int w, int h) { return null; }
    public static AbstractWidget createFor(Minecraft mc, java.util.UUID id, String name, int w, int h) { return null; }
    public static boolean faceOf(Minecraft mc, net.minecraft.client.gui.GuiGraphics g, java.util.UUID id, String name, int x, int y, int size) { return false; }
    public record Pose(float swing, float held, float walk, float time, float headYaw, float headPitch) {}
    public static float swingSign = 1f;
    public static boolean draw(Minecraft mc, net.minecraft.client.gui.GuiGraphics g, String key, java.util.UUID id, String name,
                               int x0, int y0, int x1, int y1, float height, float yaw, Pose p) { return false; }
}
