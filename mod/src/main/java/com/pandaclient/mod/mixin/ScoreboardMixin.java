package com.pandaclient.mod.mixin;

import com.pandaclient.mod.module.Modules;
import net.minecraft.client.gui.Gui;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.world.scores.Objective;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Scoreboard: hide, resize or move the sidebar. */
@Mixin(Gui.class)
public abstract class ScoreboardMixin {
    private boolean pandaclient$pushed;

    @Inject(method = "displayScoreboardSidebar", at = @At("HEAD"), cancellable = true, require = 0)
    private void pandaclient$start(GuiGraphics g, Objective objective, CallbackInfo ci) {
        var s = Modules.SCOREBOARD;
        if (!s.enabled()) return;
        if (s.hide.on()) { ci.cancel(); return; }
        float k = s.size.asFloat();
        g.pose().pushMatrix();
        pandaclient$pushed = true;
        g.pose().translate(g.guiWidth(), g.guiHeight() / 2f + s.offset.asFloat());
        g.pose().scale(k, k);
        g.pose().translate(-g.guiWidth(), -g.guiHeight() / 2f);
    }

    @Inject(method = "displayScoreboardSidebar", at = @At("RETURN"), require = 0)
    private void pandaclient$end(GuiGraphics g, Objective objective, CallbackInfo ci) {
        if (pandaclient$pushed) { g.pose().popMatrix(); pandaclient$pushed = false; }
    }
}
