package com.pandaclient.mod.mixin;

import com.pandaclient.mod.module.Modules;
import net.minecraft.client.renderer.entity.state.HitboxRenderState;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Hitbox Colour: recolour the white entity boxes (the red eye line and blue look line stay). */
@Mixin(HitboxRenderState.class)
public abstract class HitboxColorMixin {
    @Shadow @Final private float red;
    @Shadow @Final private float green;
    @Shadow @Final private float blue;

    private boolean pandaclient$white() { return Modules.HITBOX_COLOR.enabled() && red == 1f && green == 1f && blue == 1f; }
    private float pandaclient$c(int shift) { return ((Modules.HITBOX_COLOR.color.argb() >> shift) & 255) / 255f; }

    @Inject(method = "red", at = @At("RETURN"), cancellable = true, require = 0)
    private void pandaclient$red(CallbackInfoReturnable<Float> cir) { if (pandaclient$white()) cir.setReturnValue(pandaclient$c(16)); }
    @Inject(method = "green", at = @At("RETURN"), cancellable = true, require = 0)
    private void pandaclient$green(CallbackInfoReturnable<Float> cir) { if (pandaclient$white()) cir.setReturnValue(pandaclient$c(8)); }
    @Inject(method = "blue", at = @At("RETURN"), cancellable = true, require = 0)
    private void pandaclient$blue(CallbackInfoReturnable<Float> cir) { if (pandaclient$white()) cir.setReturnValue(pandaclient$c(0)); }
}
