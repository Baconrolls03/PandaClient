package com.pandaclient.mod.mixin;

import com.pandaclient.mod.module.Modules;
import net.minecraft.client.Minecraft;
import net.minecraft.world.entity.Entity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyVariable;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(Entity.class)
public abstract class EntityMixin {
    private boolean pandaclient$isLocalPlayer() { return (Object) this == Minecraft.getInstance().player; }

    /** Zoom: lower mouse sensitivity while zoomed in. */
    @ModifyVariable(method = "turn", at = @At("HEAD"), argsOnly = true, ordinal = 0)
    private double pandaclient$zoomYaw(double v) { return pandaclient$scale(v); }

    @ModifyVariable(method = "turn", at = @At("HEAD"), argsOnly = true, ordinal = 1)
    private double pandaclient$zoomPitch(double v) { return pandaclient$scale(v); }

    private double pandaclient$scale(double v) {
        var z = Modules.ZOOM;
        if (z.zooming() && z.lowerSensitivity.on() && pandaclient$isLocalPlayer()) return v * Math.max(0.05, z.multiplier());
        return v;
    }

    /** Freelook: mouse moves the camera, not the player. */
    @Inject(method = "turn", at = @At("HEAD"), cancellable = true)
    private void pandaclient$freelook(double yaw, double pitch, CallbackInfo ci) {
        var fl = Modules.FREELOOK;
        if (!fl.active || !pandaclient$isLocalPlayer()) return;
        fl.yaw += (float) (yaw * 0.15);
        fl.pitch = Math.max(-90f, Math.min(90f, fl.pitch + (float) (pitch * 0.15) * (fl.invert.on() ? -1 : 1)));
        ci.cancel();
    }
}
