package com.pandaclient.mod.mixin;

import com.pandaclient.mod.cosmetics.CapeTextures;
import com.pandaclient.mod.cosmetics.CosmeticsApi;
import com.pandaclient.mod.module.Modules;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.core.ClientAsset;
import net.minecraft.world.entity.player.PlayerSkin;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** PandaClient capes: players wearing one in the Wardrobe show it to everyone with PandaClient. */
@Mixin(AbstractClientPlayer.class)
public abstract class AbstractClientPlayerMixin {
    @Inject(method = "getSkin", at = @At("RETURN"), cancellable = true)
    private void pandaclient$cape(CallbackInfoReturnable<PlayerSkin> cir) {
        if (!Modules.COSMETICS.enabled() || !Modules.COSMETICS.capes.on()) return;
        PlayerSkin skin = cir.getReturnValue();
        if (skin == null) return;
        AbstractClientPlayer self = (AbstractClientPlayer) (Object) this;
        CosmeticsApi.Cosmetic cape = CosmeticsApi.equipped(self.getUUID(), "cape");
        if (cape == null) return;
        if (Modules.COSMETICS.keepMojangCape.on() && skin.cape() != null) return;
        ClientAsset.Texture tex = CapeTextures.get(cape);
        cir.setReturnValue(new PlayerSkin(skin.body(), tex, Modules.COSMETICS.elytra.on() ? tex : skin.elytra(), skin.model(), skin.secure()));
    }
}
