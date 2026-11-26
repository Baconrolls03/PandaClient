package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.module.Setting;
import com.pandaclient.mod.util.Game;

public final class SpeedHud extends TextHud {
    public final Setting.Bool vertical = add(new Setting.Bool("vertical", "Include vertical", false));
    public SpeedHud() { super("speed", "Speed", "Shows how fast you are moving in blocks per second.", false, 0.0, 0.4); }
    @Override protected String label() { return "Speed"; }
    @Override protected String value(boolean preview) {
        if (!Game.inWorld()) return "5.61 m/s";
        return String.format("%.2f m/s", Game.speed(vertical.on()));
    }
}
