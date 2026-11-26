package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

public final class SkyColor extends Module {
    public final Setting.Color color = add(new Setting.Color("color", "Sky colour", 0xFF7BA4FF));
    public SkyColor() { super("skycolor", "Sky Colour", "Paint the sky any colour you like (only for you).", Category.VISUAL, false); }
}
