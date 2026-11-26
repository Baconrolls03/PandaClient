package com.pandaclient.mod.mixin;

import com.pandaclient.mod.module.Modules;
import net.minecraft.client.Camera;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyArg;

@Mixin(Camera.class)
public abstract class CameraMixin {
    @ModifyArg(method = "setup", at = @At(value = "INVOKE", target = "Lnet/minecraft/client/Camera;setRotation(FF)V"), index = 0)
    private float pandaclient$freelookYaw(float yaw) { return Modules.FREELOOK.active ? Modules.FREELOOK.yaw : yaw; }

    @ModifyArg(method = "setup", at = @At(value = "INVOKE", target = "Lnet/minecraft/client/Camera;setRotation(FF)V"), index = 1)
    private float pandaclient$freelookPitch(float pitch) { return Modules.FREELOOK.active ? Modules.FREELOOK.pitch : pitch; }
}
