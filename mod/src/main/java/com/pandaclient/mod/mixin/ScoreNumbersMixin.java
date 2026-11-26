package com.pandaclient.mod.mixin;

import com.pandaclient.mod.module.Modules;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;

/** Scoreboard: hide the red score numbers. */
@Mixin(targets = "net.minecraft.client.gui.Gui$1DisplayEntry")
public abstract class ScoreNumbersMixin {
    @ModifyVariable(method = "<init>", at = @At("HEAD"), argsOnly = true, ordinal = 1, require = 0)
    private static Component pandaclient$score(Component score) {
        return pandaclient$hide() ? Component.empty() : score;
    }

    @ModifyVariable(method = "<init>", at = @At("HEAD"), argsOnly = true, ordinal = 0, require = 0)
    private static int pandaclient$width(int width) {
        return pandaclient$hide() ? 0 : width;
    }

    private static boolean pandaclient$hide() { return Modules.SCOREBOARD.enabled() && !Modules.SCOREBOARD.numbers.on(); }
}
