package com.pandaclient.mod.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import com.pandaclient.mod.module.Modules;
import net.minecraft.client.Camera;
import net.minecraft.client.renderer.GameRenderer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(GameRenderer.class)
public abstract class GameRendererMixin {
    /** Zoom: narrow the field of view. */
    @Inject(method = "getFov", at = @At("RETURN"), cancellable = true)
    private void pandaclient$zoom(Camera camera, float partialTick, boolean useFovSetting, CallbackInfoReturnable<Float> cir) {
        double m = Modules.ZOOM.multiplier();
        if (m != 1.0) cir.setReturnValue((float) (cir.getReturnValue() * m));
    }

    /** No Hurt Cam: skip the screen tilt when you take damage. */
    @Inject(method = "bobHurt", at = @At("HEAD"), cancellable = true)
    private void pandaclient$noHurtCam(PoseStack pose, float partialTick, CallbackInfo ci) {
        if (Modules.NO_HURT_CAM.enabled()) ci.cancel();
    }
}
