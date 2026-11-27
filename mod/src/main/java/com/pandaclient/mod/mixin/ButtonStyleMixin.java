package com.pandaclient.mod.mixin;

import com.pandaclient.mod.gui.ButtonStyle;
import com.pandaclient.mod.gui.Draw;
import com.pandaclient.mod.module.Modules;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.AbstractButton;
import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.ImageButton;
import net.minecraft.client.gui.components.PlainTextButton;
import net.minecraft.client.gui.components.SpriteIconButton;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Button style "PandaClient": flat rounded buttons in every menu (Options, pause menu, other mods' screens). */
@Mixin(AbstractButton.class)
public abstract class ButtonStyleMixin {
    @Inject(method = "renderWidget", at = @At("HEAD"), cancellable = true, require = 0)
    private void pandaclient$style(GuiGraphics g, int mouseX, int mouseY, float delta, CallbackInfo ci) {
        Object self = this;
        if (!(self instanceof Button) || self instanceof PlainTextButton || self instanceof SpriteIconButton || self instanceof ImageButton) return;
        if (!Modules.TITLE_SCREEN.enabled() || !Modules.TITLE_SCREEN.buttons.is("PandaClient")) return;
        AbstractWidget w = (AbstractWidget) self;
        int kind = w == com.pandaclient.mod.gui.PauseLayout.primary ? 1 : w == com.pandaclient.mod.gui.PauseLayout.danger ? 2 : 0;
        ButtonStyle.draw(new Draw(g), w.getX(), w.getY(), w.getWidth(), w.getHeight(), w.getMessage(), w.isActive(), w.isHoveredOrFocused(), kind);
        ci.cancel();
    }
}
