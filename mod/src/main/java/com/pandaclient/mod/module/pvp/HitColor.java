package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

/** Recolours the flash players and mobs get when they're hit. */
public final class HitColor extends Module {
    public final Setting.Color color = add(new Setting.Color("color", "Hit colour", 0x994F8CFF));
    public HitColor() { super("hitcolor", "Hit Color", "Changes the colour players and mobs flash when they get hit.", Category.VISUAL, false); }
}
