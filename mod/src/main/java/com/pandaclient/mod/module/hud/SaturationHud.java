package com.pandaclient.mod.module.hud;

import net.minecraft.client.Minecraft;

public final class SaturationHud extends TextHud {
    public SaturationHud() { super("saturation", "Saturation", "Shows your hidden hunger saturation.", false, 0.0, 0.45); }
    @Override protected String label() { return "Saturation"; }
    @Override protected String value(boolean preview) {
        var p = Minecraft.getInstance().player;
        return p == null ? "12.5" : String.format("%.1f", p.getFoodData().getSaturationLevel());
    }
}
