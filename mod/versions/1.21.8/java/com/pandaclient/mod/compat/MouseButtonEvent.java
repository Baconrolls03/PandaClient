package com.pandaclient.mod.compat;

import net.minecraft.client.Minecraft;
import org.lwjgl.glfw.GLFW;

/** Before 1.21.9 Minecraft passed mouse clicks as plain numbers; this gives them the newer shape. */
public record MouseButtonEvent(double x, double y, int button) {
    public int modifiers() {
        long w = Minecraft.getInstance().getWindow().getWindow();
        boolean shift = GLFW.glfwGetKey(w, GLFW.GLFW_KEY_LEFT_SHIFT) == GLFW.GLFW_PRESS || GLFW.glfwGetKey(w, GLFW.GLFW_KEY_RIGHT_SHIFT) == GLFW.GLFW_PRESS;
        return shift ? GLFW.GLFW_MOD_SHIFT : 0;
    }
}
