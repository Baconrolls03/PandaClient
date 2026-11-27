package com.pandaclient.mod.cosmetics;

import com.google.gson.JsonElement;
import com.mojang.blaze3d.platform.NativeImage;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.resources.ResourceLocation;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** One texture per PandaClient cape, painted on first use (render thread only). */
public final class CapeTextures {
    private CapeTextures() {}
    private static final Map<String, ResourceLocation> CACHE = new HashMap<>();

    public static ResourceLocation get(CosmeticsApi.Cosmetic c) {
        ResourceLocation t = CACHE.get(c.id());
        if (t != null) return t;
        String pattern = c.model().has("pattern") ? c.model().get("pattern").getAsString() : "gradient";
        List<String> colors = new ArrayList<>();
        if (c.model().has("colors")) for (JsonElement e : c.model().getAsJsonArray("colors")) colors.add(e.getAsString());
        int[] px = CapePainter.paint(pattern, colors);
        NativeImage img = new NativeImage(64, 32, true);
        for (int y = 0; y < 32; y++) for (int x = 0; x < 64; x++) img.setPixel(x, y, px[y * 64 + x]);
        String safe = c.id().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_.-]", "_");
        t = ResourceLocation.fromNamespaceAndPath("pandaclient", "cape/" + safe);
        Minecraft.getInstance().getTextureManager().register(t, new DynamicTexture(() -> "PandaClient cape " + safe, img));
        CACHE.put(c.id(), t);
        return t;
    }
}
