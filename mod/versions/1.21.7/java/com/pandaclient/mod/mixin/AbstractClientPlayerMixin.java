package com.pandaclient.mod.mixin;

import com.pandaclient.mod.cosmetics.CapeTextures;
import com.pandaclient.mod.cosmetics.CosmeticsApi;
import com.pandaclient.mod.module.Modules;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.resources.PlayerSkin;
import net.minecraft.resources.ResourceLocation;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** PandaClient capes (1.21.8: skins hold plain texture ids). */
@Mixin(AbstractClientPlayer.class)
public abstract class AbstractClientPlayerMixin {
    @Inject(method = "getSkin", at = @At("RETURN"), cancellable = true, require = 0)
    private void pandaclient$cape(CallbackInfoReturnable<PlayerSkin> cir) {
        if (!Modules.COSMETICS.enabled() || !Modules.COSMETICS.capes.on()) return;
        PlayerSkin skin = cir.getReturnValue();
        if (skin == null) return;
        AbstractClientPlayer self = (AbstractClientPlayer) (Object) this;
        CosmeticsApi.Cosmetic cape = CosmeticsApi.equipped(self.getUUID(), "cape");
        if (cape == null) return;
        if (Modules.COSMETICS.keepMojangCape.on() && skin.capeTexture() != null) return;
        ResourceLocation tex = CapeTextures.get(cape);
        cir.setReturnValue(new PlayerSkin(skin.texture(), skin.textureUrl(), tex, Modules.COSMETICS.elytra.on() ? tex : skin.elytraTexture(), skin.model(), skin.secure()));
    }
}
