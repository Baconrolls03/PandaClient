package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

/** Hold a key to look around your player in third person without turning. */
public final class Freelook extends Module {
    public final Setting.Bool hold = add(new Setting.Bool("hold", "Hold (off = toggle)", true));
    public final Setting.Bool invert = add(new Setting.Bool("invert", "Invert vertical", false));
    public boolean active;
    public float yaw, pitch;
    public Freelook() { super("freelook", "Freelook", "Hold Left Alt to look around without turning. Some servers don't allow it.", Category.PVP, false); }
}
