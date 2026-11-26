package com.pandaclient.mod.mixin;

import com.pandaclient.mod.cosmetics.CosmeticsApi;
import com.pandaclient.mod.module.Modules;
import net.minecraft.ChatFormatting;
import net.minecraft.client.gui.components.PlayerTabOverlay;
import net.minecraft.client.multiplayer.PlayerInfo;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** PandaClient Badge: a mark before the names of PandaClient players in the tab list. */
@Mixin(PlayerTabOverlay.class)
public abstract class PlayerTabOverlayMixin {
    @Inject(method = "getNameForDisplay", at = @At("RETURN"), cancellable = true)
    private void pandaclient$badge(PlayerInfo info, CallbackInfoReturnable<Component> cir) {
        if (!Modules.BADGE.enabled() || info == null || info.getProfile() == null) return;
        if (!CosmeticsApi.LOADOUTS.containsKey(CosmeticsApi.key(info.getProfile().id()))) return;
        cir.setReturnValue(Component.literal("✦ ").withStyle(ChatFormatting.GREEN).append(cir.getReturnValue()));
    }
}
