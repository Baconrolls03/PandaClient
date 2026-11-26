package com.pandaclient.mod.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import com.pandaclient.mod.module.Modules;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.ItemInHandRenderer;
import net.minecraft.client.renderer.SubmitNodeCollector;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.item.ItemStack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** 1.7 Animations: move / resize the item in your hand. */
@Mixin(ItemInHandRenderer.class)
public abstract class HeldItemMixin {
    @Inject(method = "renderArmWithItem", at = @At("HEAD"), require = 0)
    private void pandaclient$start(AbstractClientPlayer player, float partial, float pitch, InteractionHand hand, float swing, ItemStack stack, float equip,
                                   PoseStack pose, SubmitNodeCollector collector, int light, CallbackInfo ci) {
        pose.pushPose();
        if (!Modules.OLD_ANIMATIONS.enabled() || stack.isEmpty()) return;
        float[] t = Modules.OLD_ANIMATIONS.transform();
        float side = hand == InteractionHand.MAIN_HAND ? 1 : -1;
        pose.translate(t[0] * side, t[1], -t[2]);
        pose.scale(t[3], t[3], t[3]);
    }

    @Inject(method = "renderArmWithItem", at = @At("RETURN"), require = 0)
    private void pandaclient$end(AbstractClientPlayer player, float partial, float pitch, InteractionHand hand, float swing, ItemStack stack, float equip,
                                 PoseStack pose, SubmitNodeCollector collector, int light, CallbackInfo ci) {
        pose.popPose();
    }
}
