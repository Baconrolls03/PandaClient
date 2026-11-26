package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Setting;
import com.pandaclient.mod.module.hud.TextHud;

/** Press sprint (or sneak) once to keep it on, like Lunar's ToggleSprint. Shows its state on the HUD. */
public final class ToggleSprint extends TextHud {
    public final Setting.Bool sneak = add(new Setting.Bool("sneak", "Toggle sneak too", false));
    public final Setting.Bool showStatus = add(new Setting.Bool("status", "Show status on HUD", true));
    public boolean sprinting, sneaking;

    public ToggleSprint() {
        super("togglesprint", "Toggle Sprint", "Press sprint once to keep sprinting. Optional toggle sneak.", Category.PVP, true, 0.0, 1.0);
        showLabel.set(false);
        background.set(false);
    }
    @Override protected String label() { return ""; }
    @Override protected String value(boolean preview) {
        if (sneaking) return "[Sneaking (Toggled)]";
        if (sprinting) return "[Sprinting (Toggled)]";
        return preview ? "[Sprinting (Toggled)]" : "";
    }
    @Override public boolean visible() { return showStatus.on() && (sprinting || sneaking); }
}
