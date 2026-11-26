package com.pandaclient.mod.mixin;

import com.pandaclient.mod.module.Modules;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Time Changer: the time of day you see (only on your screen). */
@Mixin(targets = "net.minecraft.client.multiplayer.ClientLevel$ClientLevelData")
public abstract class ClientLevelDataMixin {
    @Inject(method = "getDayTime", at = @At("RETURN"), cancellable = true)
    private void pandaclient$time(CallbackInfoReturnable<Long> cir) {
        if (Modules.TIME.enabled()) {
            long day = cir.getReturnValue() / 24000L * 24000L;
            cir.setReturnValue(day + (long) Modules.TIME.time.asInt());
        }
    }
}
