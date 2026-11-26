package com.pandaclient.mod.mixin;

import com.pandaclient.mod.util.Fullbright;
import net.minecraft.client.renderer.LightTexture;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(LightTexture.class)
public abstract class LightTextureMixin {
    @Inject(method = "updateLightTexture", at = @At("HEAD"))
    private void pandaclient$start(float partialTick, CallbackInfo ci) { Fullbright.updating = true; }

    @Inject(method = "updateLightTexture", at = @At("RETURN"))
    private void pandaclient$end(float partialTick, CallbackInfo ci) { Fullbright.updating = false; }
}
