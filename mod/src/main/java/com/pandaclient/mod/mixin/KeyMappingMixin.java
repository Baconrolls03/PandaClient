package com.pandaclient.mod.mixin;

import com.pandaclient.mod.module.Modules;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Toggle Sprint / Sneak: report the key as held while the toggle is on. */
@Mixin(KeyMapping.class)
public abstract class KeyMappingMixin {
    @Inject(method = "isDown", at = @At("RETURN"), cancellable = true)
    private void pandaclient$toggle(CallbackInfoReturnable<Boolean> cir) {
        if (cir.getReturnValue()) return;
        var ts = Modules.TOGGLE_SPRINT;
        if (!ts.enabled()) return;
        Minecraft mc = Minecraft.getInstance();
        if (mc.options == null || mc.screen != null) return;
        if (ts.sprinting && (Object) this == mc.options.keySprint) cir.setReturnValue(true);
        else if (ts.sneaking && (Object) this == mc.options.keyShift) cir.setReturnValue(true);
    }
}
