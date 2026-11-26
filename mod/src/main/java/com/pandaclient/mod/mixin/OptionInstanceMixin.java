package com.pandaclient.mod.mixin;

import com.pandaclient.mod.module.Modules;
import com.pandaclient.mod.util.Fullbright;
import net.minecraft.client.Minecraft;
import net.minecraft.client.OptionInstance;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Fullbright: while the light texture is being built, report a high gamma (the saved setting is untouched). */
@Mixin(OptionInstance.class)
public abstract class OptionInstanceMixin {
    @Inject(method = "get", at = @At("RETURN"), cancellable = true)
    private void pandaclient$gamma(CallbackInfoReturnable<Object> cir) {
        if (!Fullbright.updating || !Modules.FULLBRIGHT.enabled()) return;
        var options = Minecraft.getInstance().options;
        if (options != null && (Object) this == options.gamma()) cir.setReturnValue(Modules.FULLBRIGHT.brightness.get());
    }
}
