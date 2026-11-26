package com.pandaclient.mod.mixin;

import com.pandaclient.mod.module.Modules;
import net.minecraft.ChatFormatting;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.entity.EntityRenderer;
import net.minecraft.client.renderer.entity.LivingEntityRenderer;
import net.minecraft.network.chat.Component;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Nametags: health next to player names. */
@Mixin(EntityRenderer.class)
public abstract class NametagMixin {
    @Inject(method = "getNameTag", at = @At("RETURN"), cancellable = true, require = 0)
    private void pandaclient$health(Entity entity, CallbackInfoReturnable<Component> cir) {
        var n = Modules.NAMETAGS;
        if (!n.enabled() || !n.health.on() || !(entity instanceof Player p) || cir.getReturnValue() == null) return;
        float hp = (p.getHealth() + p.getAbsorptionAmount()) / 2f;
        ChatFormatting c = hp > 6 ? ChatFormatting.GREEN : hp > 3 ? ChatFormatting.YELLOW : ChatFormatting.RED;
        cir.setReturnValue(cir.getReturnValue().copy().append(Component.literal(String.format(" %.1f❤", hp)).withStyle(c)));
    }
}
