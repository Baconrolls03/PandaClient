package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

/** Hold a key to zoom in (OptiFine/Lunar style). */
public final class Zoom extends Module {
    public final Setting.Num factor = add(new Setting.Num("factor", "Zoom amount", 4, 1.5, 20, 0.5));
    public final Setting.Bool scroll = add(new Setting.Bool("scroll", "Scroll to change zoom", true));
    public final Setting.Bool smooth = add(new Setting.Bool("smooth", "Smooth zoom", true));
    public final Setting.Bool cinematic = add(new Setting.Bool("cinematic", "Smooth camera while zoomed", false));
    public final Setting.Bool lowerSensitivity = add(new Setting.Bool("sensitivity", "Lower sensitivity while zoomed", true));

    public boolean held;
    public double scrollFactor = 1;
    private double current = 1;

    public Zoom() { super("zoom", "Zoom", "Hold C to zoom in. Scroll to zoom further.", Category.PVP, true); }

    /** The FOV multiplier for this frame (1 = no zoom). */
    public double multiplier() {
        double target = enabled() && held ? 1.0 / (factor.get() * scrollFactor) : 1.0;
        if (!smooth.on()) current = target;
        else current += (target - current) * 0.35;
        if (Math.abs(current - target) < 0.001) current = target;
        return current;
    }
    public boolean zooming() { return enabled() && held; }
    public void scrolled(double amount) {
        scrollFactor = Math.max(0.5, Math.min(5, scrollFactor * (amount > 0 ? 1.15 : 1 / 1.15)));
    }
}
