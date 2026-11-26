package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.module.Setting;
import com.pandaclient.mod.util.Clicks;

public final class CpsHud extends TextHud {
    public final Setting.Bool right = add(new Setting.Bool("right", "Show right clicks", true));
    public CpsHud() { super("cps", "CPS", "Shows your clicks per second.", true, 0.0, 0.05); }
    @Override protected String label() { return "CPS"; }
    @Override protected String value(boolean preview) {
        return right.on() ? Clicks.left() + " | " + Clicks.right() : String.valueOf(Clicks.left());
    }
}
