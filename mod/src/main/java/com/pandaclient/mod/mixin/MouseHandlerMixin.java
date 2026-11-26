package com.pandaclient.mod.mixin;

import com.pandaclient.mod.module.Modules;
import com.pandaclient.mod.util.Clicks;
import net.minecraft.client.Minecraft;
import net.minecraft.client.MouseHandler;
import net.minecraft.client.input.MouseButtonInfo;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(MouseHandler.class)
public abstract class MouseHandlerMixin {
    /** CPS / Keystrokes: count presses (action 1 = press). */
    @Inject(method = "onButton", at = @At("HEAD"))
    private void pandaclient$click(long window, MouseButtonInfo info, int action, CallbackInfo ci) {
        if (action == 1 && Minecraft.getInstance().screen == null) Clicks.press(info.button());
    }

    /** Zoom: scroll while zooming changes the zoom instead of the hotbar slot. */
    @Inject(method = "onScroll", at = @At("HEAD"), cancellable = true)
    private void pandaclient$zoomScroll(long window, double horizontal, double vertical, CallbackInfo ci) {
        if (Modules.ZOOM.zooming() && Modules.ZOOM.scroll.on() && Minecraft.getInstance().screen == null && vertical != 0) {
            Modules.ZOOM.scrolled(vertical);
            ci.cancel();
        }
    }
}
