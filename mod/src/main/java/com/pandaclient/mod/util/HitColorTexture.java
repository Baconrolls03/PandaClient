package com.pandaclient.mod.util;

import com.mojang.blaze3d.platform.NativeImage;
import com.pandaclient.mod.module.Modules;
import net.minecraft.client.renderer.texture.DynamicTexture;

/** Repaints the hurt-flash rows of Minecraft's overlay texture with the Hit Color mod's colour. */
public final class HitColorTexture {
    private HitColorTexture() {}
    public static DynamicTexture texture;
    public static boolean dirty;
    private static int applied = 0xB2FF0000;
    private static int counter;

    public static void tick() {
        if (texture == null) return;
        int want = Modules.HIT_COLOR.enabled() ? Modules.HIT_COLOR.color.argb() : 0xB2FF0000;
        if (Modules.HIT_COLOR.color.chroma && Modules.HIT_COLOR.enabled() && ++counter % 2 != 0 && !dirty) return;
        if (want == applied && !dirty) return;
        NativeImage img = texture.getPixels();
        if (img == null) return;
        for (int y = 0; y < 8; y++) for (int x = 0; x < 16; x++) img.setPixel(x, y, want);
        texture.upload();
        applied = want;
        dirty = false;
    }
}
