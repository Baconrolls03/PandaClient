package com.pandaclient.mod;

import com.mojang.blaze3d.platform.InputConstants;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.minecraft.client.KeyMapping;
import net.minecraft.resources.Identifier;
import org.lwjgl.glfw.GLFW;

/** PandaClient's key binds. They also show up (and can be changed) in Options → Controls → Key Binds. */
public final class Keys {
    private Keys() {}
    public static final KeyMapping.Category CATEGORY = KeyMapping.Category.register(Identifier.fromNamespaceAndPath("pandaclient", "main"));
    public static KeyMapping MENU, ZOOM, FREELOOK, HUD_EDITOR;

    static void register() {
        MENU = KeyBindingHelper.registerKeyBinding(new KeyMapping("key.pandaclient.menu", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_RIGHT_SHIFT, CATEGORY));
        ZOOM = KeyBindingHelper.registerKeyBinding(new KeyMapping("key.pandaclient.zoom", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_C, CATEGORY));
        FREELOOK = KeyBindingHelper.registerKeyBinding(new KeyMapping("key.pandaclient.freelook", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_LEFT_ALT, CATEGORY));
        HUD_EDITOR = KeyBindingHelper.registerKeyBinding(new KeyMapping("key.pandaclient.hud", InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_UNKNOWN, CATEGORY));
    }

    public static String name(KeyMapping k) { return k.getTranslatedKeyMessage().getString(); }
}
