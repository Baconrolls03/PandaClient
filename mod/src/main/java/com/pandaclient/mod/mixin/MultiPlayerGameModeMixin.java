package com.pandaclient.mod.mixin;

import com.pandaclient.mod.util.Combat;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.MultiPlayerGameMode;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.phys.EntityHitResult;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Reach Display + Combo Counter: remember the distance of each hit (display only, nothing is changed). */
@Mixin(MultiPlayerGameMode.class)
public abstract class MultiPlayerGameModeMixin {
    @Inject(method = "attack", at = @At("HEAD"))
    private void pandaclient$attack(Player player, Entity target, CallbackInfo ci) {
        var hit = Minecraft.getInstance().hitResult;
        double reach = hit instanceof EntityHitResult e && e.getEntity() == target
            ? player.getEyePosition().distanceTo(hit.getLocation())
            : player.getEyePosition().distanceTo(target.position());
        Combat.attacked(target.getId(), reach);
        com.pandaclient.mod.module.Modules.HIT_SOUNDS.play();
        com.pandaclient.mod.module.Modules.PARTICLES.spawn(target);
    }
}
