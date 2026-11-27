package com.pandaclient.mod.util;

import net.minecraft.client.Minecraft;

/** On this Minecraft version the lobby uses Minecraft's own 3D panorama. */
public final class LobbyPanorama {
    private LobbyPanorama() {}
    public static void capture(Minecraft mc) {}
    public static boolean available() { return false; }
    public static boolean render(Minecraft mc, float pitch, float yaw) { return false; }
}
