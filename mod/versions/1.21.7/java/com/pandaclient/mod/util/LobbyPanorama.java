package com.pandaclient.mod.util;

import net.minecraft.client.Minecraft;

/** On this Minecraft version the lobby uses Minecraft's own 3D panorama. */
public final class LobbyPanorama {
    private LobbyPanorama() {}
    public static void capture(Minecraft mc) {}
    public static boolean available() { return false; }
    public static java.nio.file.Path previewFace() { return null; }
    public static final int SLOTS = 0;
    public static int[] scenes() { return new int[0]; }
    public static boolean render(Minecraft mc, int slot, float pitch, float yaw) { return false; }
    public static boolean renderVanilla(Minecraft mc, float pitch, float yaw) { return false; }
    public record Stage(float dist, float drop) {}
    public static Stage stage(int slot) { return null; }
    public static float yawSign = 1f, pitchSign = 1f;
    public static float[] project(float right, float up, float forward, float pitch, float yaw, float aspect) { return null; }
    public static float pitchFor(Stage s, float screenY) { return 0; }
}
