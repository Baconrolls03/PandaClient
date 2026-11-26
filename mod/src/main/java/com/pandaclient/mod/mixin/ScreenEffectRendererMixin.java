package com.pandaclient.mod.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import com.pandaclient.mod.module.Modules;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.ScreenEffectRenderer;
import net.minecraft.client.renderer.texture.TextureAtlasSprite;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(ScreenEffectRenderer.class)
public abstract class ScreenEffectRendererMixin {
    @Inject(method = "renderFire", at = @At("HEAD"))
    private static void pandaclient$lowFireStart(PoseStack pose, MultiBufferSource buffers, TextureAtlasSprite sprite, CallbackInfo ci) {
        pose.pushPose();
        if (Modules.LOW_FIRE.enabled()) pose.translate(0, -Modules.LOW_FIRE.height.get(), 0);
    }

    @Inject(method = "renderFire", at = @At("RETURN"))
    private static void pandaclient$lowFireEnd(PoseStack pose, MultiBufferSource buffers, TextureAtlasSprite sprite, CallbackInfo ci) {
        pose.popPose();
    }
}
