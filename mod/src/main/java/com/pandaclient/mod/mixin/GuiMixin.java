package com.pandaclient.mod.mixin;

import com.pandaclient.mod.gui.CrosshairRenderer;
import com.pandaclient.mod.module.Modules;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.gui.Gui;
import net.minecraft.client.gui.GuiGraphics;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(Gui.class)
public abstract class GuiMixin {
    @Inject(method = "renderCrosshair", at = @At("HEAD"), cancellable = true)
    private void pandaclient$crosshair(GuiGraphics g, DeltaTracker dt, CallbackInfo ci) {
        if (Modules.CROSSHAIR.enabled()) {
            CrosshairRenderer.render(g);
            ci.cancel();
        }
    }
}
