package com.pandaclient.mod.module.hud;

import net.minecraft.client.Minecraft;

public final class DayHud extends TextHud {
    public DayHud() { super("day", "Day Counter", "Shows which in-game day it is.", false, 1.0, 0.1); }
    @Override protected String label() { return "Day"; }
    @Override protected String value(boolean preview) {
        var l = Minecraft.getInstance().level;
        return l == null ? "42" : String.valueOf(l.getDayTime() / 24000L + 1);
    }
}
