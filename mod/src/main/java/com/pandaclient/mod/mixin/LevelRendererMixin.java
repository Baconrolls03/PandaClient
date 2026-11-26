package com.pandaclient.mod.mixin;

import com.pandaclient.mod.module.Modules;
import net.minecraft.client.renderer.LevelRenderer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;

/** Block Outline: recolour the outline of the block you're looking at. */
@Mixin(LevelRenderer.class)
public abstract class LevelRendererMixin {
    @ModifyVariable(method = "renderHitOutline", at = @At("HEAD"), argsOnly = true, ordinal = 0)
    private int pandaclient$outlineColor(int color) {
        return Modules.BLOCK_OUTLINE.enabled() ? Modules.BLOCK_OUTLINE.color.argb() : color;
    }
}
