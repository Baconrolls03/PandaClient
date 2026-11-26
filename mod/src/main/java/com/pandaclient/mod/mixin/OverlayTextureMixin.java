package com.pandaclient.mod.mixin;

import com.pandaclient.mod.util.HitColorTexture;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.client.renderer.texture.OverlayTexture;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Hit Color: the overlay texture's top half is the red flash entities get when hurt. */
@Mixin(OverlayTexture.class)
public abstract class OverlayTextureMixin {
    @Shadow @Final private DynamicTexture texture;

    @Inject(method = "<init>", at = @At("TAIL"))
    private void pandaclient$remember(CallbackInfo ci) {
        HitColorTexture.texture = texture;
        HitColorTexture.dirty = true;
    }
}
