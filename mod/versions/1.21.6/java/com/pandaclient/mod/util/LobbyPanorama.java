package com.pandaclient.mod.util;

import net.minecraft.client.Minecraft;

/** On this Minecraft version the lobby uses Minecraft's own 3D panorama. */
public final class LobbyPanorama {
    private LobbyPanorama() {}
    public static void capture(Minecraft mc) {}
    public static boolean available() { return false; }
    public static final int SLOTS = 0;
    public static int[] scenes() { return new int[0]; }
    public static boolean render(Minecraft mc, int slot, float pitch, float yaw) { return false; }
    public static boolean renderVanilla(Minecraft mc, float pitch, float yaw) { return false; }
}
