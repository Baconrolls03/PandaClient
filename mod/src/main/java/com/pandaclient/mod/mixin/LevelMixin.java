package com.pandaclient.mod.mixin;

import com.pandaclient.mod.module.Modules;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.world.level.Level;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Weather Changer: the weather you see (only on your screen). */
@Mixin(Level.class)
public abstract class LevelMixin {
    @Inject(method = "getRainLevel", at = @At("RETURN"), cancellable = true)
    private void pandaclient$rain(float partialTick, CallbackInfoReturnable<Float> cir) {
        if (Modules.WEATHER.enabled() && (Object) this instanceof ClientLevel) cir.setReturnValue(Modules.WEATHER.rain());
    }

    @Inject(method = "getThunderLevel", at = @At("RETURN"), cancellable = true)
    private void pandaclient$thunder(float partialTick, CallbackInfoReturnable<Float> cir) {
        if (Modules.WEATHER.enabled() && (Object) this instanceof ClientLevel) cir.setReturnValue(Modules.WEATHER.thunder());
    }
}
