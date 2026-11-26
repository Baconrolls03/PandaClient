package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

public final class Fullbright extends Module {
    public final Setting.Num brightness = add(new Setting.Num("brightness", "Brightness", 10, 1, 15, 0.5));
    public Fullbright() { super("fullbright", "Fullbright", "See in the dark without night vision.", Category.VISUAL, false); }
}
