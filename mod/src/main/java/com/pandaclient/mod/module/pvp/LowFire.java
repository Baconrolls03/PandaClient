package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

public final class LowFire extends Module {
    public final Setting.Num height = add(new Setting.Num("height", "Fire height", 0.35, 0, 1, 0.05));
    public LowFire() { super("lowfire", "Low Fire", "Lowers the fire overlay so you can see while burning.", Category.VISUAL, false); }
}
