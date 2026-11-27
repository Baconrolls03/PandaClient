package com.pandaclient.mod.util;

import com.mojang.blaze3d.platform.NativeImage;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.resources.Identifier;

import java.io.InputStream;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;

/** Server and world pictures for the lobby, loaded once and kept as textures. */
public final class IconCache {
    private IconCache() {}
    public record Icon(Identifier id, int w, int h) {}
    private static final Map<String, Icon> ICONS = new HashMap<>();
    private static final Set<String> FAILED = new HashSet<>();

    /** The picture for {@code key}, loading it with {@code open} the first time; null if there is none. */
    public static Icon get(String key, Callable<InputStream> open) {
        Icon icon = ICONS.get(key);
        if (icon != null || FAILED.contains(key)) return icon;
        try (InputStream in = open.call()) {
            if (in == null) { FAILED.add(key); return null; }
            NativeImage img = NativeImage.read(in);
            Identifier id = Identifier.fromNamespaceAndPath("pandaclient", "icon/" + Integer.toHexString(key.hashCode()));
            int w = img.getWidth(), h = img.getHeight();
            Minecraft.getInstance().getTextureManager().register(id, new DynamicTexture(() -> "PandaClient icon", img));
            icon = new Icon(id, w, h);
            ICONS.put(key, icon);
            return icon;
        } catch (Throwable t) {
            FAILED.add(key);
            return null;
        }
    }
}
