package com.pandaclient.mod.mixin;

import com.pandaclient.mod.module.Modules;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.entity.LivingEntityRenderer;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Nametags: see your own name in third person. */
@Mixin(LivingEntityRenderer.class)
public abstract class OwnNametagMixin {
    @Inject(method = "shouldShowName(Lnet/minecraft/world/entity/LivingEntity;D)Z", at = @At("RETURN"), cancellable = true, require = 0)
    private void pandaclient$own(LivingEntity entity, double dist, CallbackInfoReturnable<Boolean> cir) {
        var n = Modules.NAMETAGS;
        Minecraft mc = Minecraft.getInstance();
        if (n.enabled() && n.showOwn.on() && entity == mc.player && !mc.options.getCameraType().isFirstPerson() && !mc.options.hideGui) cir.setReturnValue(true);
    }
}
