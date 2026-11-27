package com.pandaclient.mod.mixin;

import com.pandaclient.mod.module.Modules;
import net.minecraft.client.multiplayer.ClientLevel;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Sky Colour (before 1.21.9 the sky colour came straight from the level). */
@Mixin(ClientLevel.class)
public abstract class SkyRendererMixin {
    @Inject(method = "getSkyColor", at = @At("RETURN"), cancellable = true, require = 0)
    private void pandaclient$sky(CallbackInfoReturnable<Object> cir) {
        if (Modules.SKY_COLOR.enabled() && cir.getReturnValue() instanceof Integer) cir.setReturnValue(Modules.SKY_COLOR.color.argb() | 0xFF000000);
    }
}
